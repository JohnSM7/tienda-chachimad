<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { supabase, type Product, getProductImageUrl } from "../../lib/supabase";
import { uploadProductImage, syncProduct, deleteProductImage } from "../../lib/admin";

const props = defineProps<{ product: Product | null }>();
const emit = defineEmits<{
  saved: [product: Product];
  cancel: [];
}>();

const isEdit = computed(() => !!props.product?.id);

const form = ref({
  id: props.product?.id ?? undefined,
  slug: props.product?.slug ?? "",
  name: props.product?.name ?? "",
  description: props.product?.description ?? "",
  price_eur: props.product?.price_cents ? props.product.price_cents / 100 : 0,
  category_slug: props.product?.category_slug ?? "madcry",
  status: (props.product?.status ?? "draft") as
    | "draft"
    | "available"
    | "reserved"
    | "sold",
  is_new: props.product?.is_new ?? false,
  images: (Array.isArray(props.product?.images)
    ? (props.product?.images as string[])
    : []) as string[],
  dimensions: props.product?.dimensions ?? "",
  technique: props.product?.technique ?? "",
  year_created: props.product?.year_created ?? null,
});

const saving = ref(false);
const uploading = ref(false);
const error = ref<string | null>(null);

// === Slug: auto-genera desde el nombre, comprueba duplicados ===
const slugManuallyEdited = ref(isEdit.value); // si editamos, no auto-sobrescribir
const slugCheck = ref<"idle" | "checking" | "available" | "taken" | "invalid">(
  "idle",
);
let slugCheckTimer: ReturnType<typeof setTimeout> | null = null;

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quitar tildes
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function onSlugInput() {
  slugManuallyEdited.value = true;
}

const categories = [
  { id: "madcry", name: "MadCry" },
  { id: "one-piece", name: "One Piece" },
  { id: "dragon-ball", name: "Dragon Ball" },
  { id: "jujutsu-kaisen", name: "Jujutsu Kaisen" },
  { id: "naruto", name: "Naruto" },
  { id: "custom", name: "Custom" },
  { id: "otros", name: "Otros" },
];

// Auto-genera slug mientras el usuario escribe el nombre (hasta que toque
// manualmente el campo slug — entonces respeta su edicion).
watch(
  () => form.value.name,
  (name) => {
    if (!slugManuallyEdited.value && name) {
      form.value.slug = slugify(name);
    }
  },
);

// Comprueba en BD si el slug esta libre (debounced).
watch(
  () => form.value.slug,
  (slug) => {
    if (slugCheckTimer) clearTimeout(slugCheckTimer);
    if (!slug) {
      slugCheck.value = "idle";
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      slugCheck.value = "invalid";
      return;
    }
    slugCheck.value = "checking";
    slugCheckTimer = setTimeout(async () => {
      let q = supabase.from("products").select("id").eq("slug", slug).limit(1);
      if (form.value.id) q = q.neq("id", form.value.id);
      const { data, error: e } = await q;
      if (e) {
        slugCheck.value = "idle";
        return;
      }
      slugCheck.value = data && data.length > 0 ? "taken" : "available";
    }, 350);
  },
);

async function onFileUpload(e: Event) {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;

  uploading.value = true;
  error.value = null;
  try {
    for (const file of Array.from(files)) {
      const slug = form.value.slug || `tmp-${Date.now()}`;
      const { path } = await uploadProductImage(file, slug);
      form.value.images.push(path);
    }
  } catch (e: any) {
    error.value = e?.message ?? "Error subiendo imagen";
  } finally {
    uploading.value = false;
    target.value = "";
  }
}

async function removeImage(index: number) {
  const path = form.value.images[index];
  form.value.images.splice(index, 1);
  if (path && !path.startsWith("/") && !path.startsWith("http")) {
    await deleteProductImage(path).catch(() => {});
  }
}

function moveImage(index: number, dir: -1 | 1) {
  const target = index + dir;
  if (target < 0 || target >= form.value.images.length) return;
  const tmp = form.value.images[index];
  form.value.images[index] = form.value.images[target];
  form.value.images[target] = tmp;
}

async function handleSubmit() {
  if (saving.value) return;
  if (slugCheck.value === "taken") {
    error.value = "El slug ya esta en uso por otro cuadro. Cambialo.";
    return;
  }
  if (slugCheck.value === "invalid") {
    error.value = "El slug solo puede contener minusculas, numeros y guiones.";
    return;
  }
  saving.value = true;
  error.value = null;

  try {
    const payload = {
      id: form.value.id,
      slug: form.value.slug.trim(),
      name: form.value.name.trim(),
      description: form.value.description.trim() || null,
      price_cents: Math.round(form.value.price_eur * 100),
      category_slug: form.value.category_slug,
      status: form.value.status,
      is_new: form.value.is_new,
      images: form.value.images,
      dimensions: form.value.dimensions.trim() || null,
      technique: form.value.technique.trim() || null,
      year_created: form.value.year_created || null,
    };

    const result = await syncProduct(isEdit.value ? "update" : "create", payload);
    emit("saved", result.product);
  } catch (e: any) {
    error.value = e?.message ?? "Error guardando";
  } finally {
    saving.value = false;
  }
}

async function handleDelete() {
  if (!form.value.id) return;
  if (
    !confirm(
      "¿Borrar este cuadro? Pasara a estado 'draft' y se archivara en Stripe. Pedidos antiguos no se pierden."
    )
  )
    return;
  saving.value = true;
  try {
    await syncProduct("delete", { id: form.value.id });
    emit("cancel");
  } catch (e: any) {
    error.value = e?.message ?? "Error borrando";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form
    @submit.prevent="handleSubmit"
    class="space-y-6 bg-zinc-900/40 border border-zinc-800 p-6"
  >
    <h2 class="text-xl uppercase tracking-widest text-white font-bold">
      {{ isEdit ? "Editar cuadro" : "Nuevo cuadro" }}
    </h2>

    <!-- Imagenes -->
    <div class="space-y-3">
      <label class="text-[10px] uppercase tracking-widest text-gray-500">
        Imagenes (la primera es la principal)
      </label>

      <div v-if="form.images.length > 0" class="grid grid-cols-4 gap-3">
        <div
          v-for="(img, i) in form.images"
          :key="img + i"
          class="relative group aspect-square bg-black border border-zinc-800"
        >
          <img
            :src="getProductImageUrl(img)"
            class="w-full h-full object-cover"
            alt="preview"
          />
          <div
            class="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/70 flex items-center justify-center gap-1 transition"
          >
            <button
              type="button"
              @click="moveImage(i, -1)"
              :disabled="i === 0"
              class="text-white text-[10px] px-2 py-1 border border-white/30 disabled:opacity-30"
              title="Subir"
            >
              ←
            </button>
            <button
              type="button"
              @click="moveImage(i, 1)"
              :disabled="i === form.images.length - 1"
              class="text-white text-[10px] px-2 py-1 border border-white/30 disabled:opacity-30"
              title="Bajar"
            >
              →
            </button>
            <button
              type="button"
              @click="removeImage(i)"
              class="text-red-400 text-[10px] px-2 py-1 border border-red-400/30"
            >
              ✕
            </button>
          </div>
          <span
            v-if="i === 0"
            class="absolute top-1 left-1 bg-white text-black text-[8px] font-bold px-1.5 py-0.5 uppercase"
          >
            Principal
          </span>
        </div>
      </div>

      <label
        class="block border-2 border-dashed border-zinc-700 hover:border-white/50 text-center py-8 cursor-pointer transition"
      >
        <input
          type="file"
          accept="image/*"
          multiple
          @change="onFileUpload"
          class="hidden"
        />
        <span class="text-xs text-gray-500 uppercase tracking-widest">
          {{ uploading ? "Subiendo..." : "+ Anadir imagen" }}
        </span>
      </label>
    </div>

    <!-- Nombre + slug -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-1">
        <label class="text-[10px] uppercase tracking-widest text-gray-500"
          >Nombre *</label
        >
        <input
          v-model="form.name"
          type="text"
          required
          class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none"
          placeholder="DROWNED IN MORALITY"
        />
      </div>
      <div class="space-y-1">
        <div class="flex items-center justify-between gap-2">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">
            Slug (URL) *
          </label>
          <span
            class="text-[10px] uppercase tracking-widest font-mono"
            :class="{
              'text-gray-500': slugCheck === 'idle' || slugCheck === 'checking',
              'text-green-400': slugCheck === 'available',
              'text-red-400': slugCheck === 'taken' || slugCheck === 'invalid',
            }"
          >
            <span v-if="slugCheck === 'checking'">comprobando…</span>
            <span v-else-if="slugCheck === 'available'">✓ disponible</span>
            <span v-else-if="slugCheck === 'taken'">✕ ya en uso</span>
            <span v-else-if="slugCheck === 'invalid'">✕ formato invalido</span>
          </span>
        </div>
        <input
          v-model="form.slug"
          @input="onSlugInput"
          type="text"
          required
          pattern="[a-z0-9\-]+"
          class="w-full bg-black border focus:border-white text-white text-sm px-3 py-2 outline-none font-mono"
          :class="{
            'border-zinc-700': slugCheck !== 'taken' && slugCheck !== 'invalid',
            'border-red-700': slugCheck === 'taken' || slugCheck === 'invalid',
          }"
          placeholder="drowned-in-morality"
        />
        <p class="text-[10px] text-gray-600 font-mono">
          madcry.com/product/<span class="text-gray-400">{{ form.slug || "tu-slug" }}</span>
        </p>
      </div>
    </div>

    <!-- Descripcion -->
    <div class="space-y-1">
      <label class="text-[10px] uppercase tracking-widest text-gray-500"
        >Descripcion</label
      >
      <textarea
        v-model="form.description"
        rows="3"
        class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none resize-none"
      ></textarea>
    </div>

    <!-- Precio + categoria + estado -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="space-y-1">
        <label class="text-[10px] uppercase tracking-widest text-gray-500"
          >Precio (EUR) *</label
        >
        <input
          v-model.number="form.price_eur"
          type="number"
          step="0.01"
          min="0"
          required
          class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none"
        />
      </div>
      <div class="space-y-1">
        <label class="text-[10px] uppercase tracking-widest text-gray-500"
          >Categoria</label
        >
        <select
          v-model="form.category_slug"
          class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none"
        >
          <option v-for="c in categories" :key="c.id" :value="c.id">
            {{ c.name }}
          </option>
        </select>
      </div>
      <div class="space-y-1">
        <label class="text-[10px] uppercase tracking-widest text-gray-500"
          >Estado</label
        >
        <select
          v-model="form.status"
          class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none"
        >
          <option value="draft">Borrador (oculto)</option>
          <option value="available">Disponible</option>
          <option value="reserved">Reservado</option>
          <option value="sold">Vendido</option>
        </select>
      </div>
    </div>

    <!-- Metadatos opcionales -->
    <details class="text-sm text-gray-400">
      <summary class="cursor-pointer text-[10px] uppercase tracking-widest text-gray-500 mb-3">
        + Detalles opcionales (dimensiones, tecnica, ano)
      </summary>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
        <input
          v-model="form.dimensions"
          type="text"
          placeholder="Dimensiones (50x70cm)"
          class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none"
        />
        <input
          v-model="form.technique"
          type="text"
          placeholder="Tecnica (Acrilico)"
          class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none"
        />
        <input
          v-model.number="form.year_created"
          type="number"
          min="1900"
          max="2100"
          placeholder="Ano (2026)"
          class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none"
        />
      </div>
    </details>

    <label class="flex items-center gap-2 text-xs text-gray-400">
      <input v-model="form.is_new" type="checkbox" class="accent-white" />
      Mostrar como "NEW" en el catalogo
    </label>

    <p v-if="error" class="text-red-500 text-xs">{{ error }}</p>

    <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-800">
      <button
        v-if="isEdit"
        type="button"
        @click="handleDelete"
        :disabled="saving"
        class="text-red-400 hover:text-red-300 text-xs uppercase tracking-widest transition"
      >
        Borrar cuadro
      </button>

      <div class="flex gap-3 ml-auto">
        <button
          type="button"
          @click="emit('cancel')"
          class="px-5 py-2 text-xs uppercase tracking-widest text-gray-400 hover:text-white transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          :disabled="
            saving ||
            uploading ||
            slugCheck === 'checking' ||
            slugCheck === 'taken' ||
            slugCheck === 'invalid'
          "
          class="px-6 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear cuadro" }}
        </button>
      </div>
    </div>
  </form>
</template>

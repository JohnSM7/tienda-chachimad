<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase, type Category } from "../../lib/supabase";

interface CategoryRow extends Category {
  price_label?: string | null;
  default_description?: string | null;
  hide_price?: boolean | null;
  show_in_menu?: boolean | null;
  menu_badge?: string | null;
}

const categories = ref<CategoryRow[]>([]);
const loading = ref(true);
const savingSlug = ref<string | null>(null);
const error = ref<string | null>(null);

// Form para crear nueva categoria
const showNewForm = ref(false);
const newCat = ref({
  slug: "",
  name: "",
  sort_order: 100,
  show_in_menu: true,
  menu_badge: "",
  hide_price: false,
  price_label: "",
  default_description: "",
});

async function load() {
  loading.value = true;
  const { data, error: e } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");
  if (e) error.value = e.message;
  categories.value = (data ?? []) as CategoryRow[];
  loading.value = false;
}

async function save(cat: CategoryRow) {
  savingSlug.value = cat.slug;
  error.value = null;
  const { error: e } = await supabase
    .from("categories")
    .update({
      name: cat.name?.trim() || cat.slug,
      sort_order: Number(cat.sort_order) || 0,
      show_in_menu: !!cat.show_in_menu,
      menu_badge: cat.menu_badge?.trim().toUpperCase() || null,
      price_label: cat.price_label?.trim() || null,
      default_description: cat.default_description?.trim() || null,
      hide_price: !!cat.hide_price,
    })
    .eq("id", cat.id);
  if (e) error.value = e.message;
  savingSlug.value = null;
  // Recarga para que el orden se aplique si cambio sort_order
  load();
}

async function createCategory() {
  error.value = null;
  if (!newCat.value.slug || !newCat.value.name) {
    error.value = "Necesitas slug y nombre";
    return;
  }
  if (!/^[a-z0-9-]+$/.test(newCat.value.slug)) {
    error.value = "El slug solo puede tener minusculas, numeros y guiones";
    return;
  }
  savingSlug.value = "__new__";
  const { error: e } = await supabase.from("categories").insert({
    slug: newCat.value.slug.trim(),
    name: newCat.value.name.trim(),
    sort_order: Number(newCat.value.sort_order) || 100,
    show_in_menu: !!newCat.value.show_in_menu,
    menu_badge: newCat.value.menu_badge.trim().toUpperCase() || null,
    hide_price: !!newCat.value.hide_price,
    price_label: newCat.value.price_label.trim() || null,
    default_description: newCat.value.default_description.trim() || null,
  });
  savingSlug.value = null;
  if (e) {
    error.value = e.message;
    return;
  }
  // Reset form y recarga
  newCat.value = {
    slug: "",
    name: "",
    sort_order: 100,
    show_in_menu: true,
    menu_badge: "",
    hide_price: false,
    price_label: "",
    default_description: "",
  };
  showNewForm.value = false;
  load();
}

async function deleteCategory(cat: CategoryRow) {
  if (!confirm(
    `¿Borrar la categoria "${cat.name}"?\n\n` +
      `Los productos asociados se quedan sin categoria — tendras que asignarles otra desde su edicion.`,
  )) return;
  savingSlug.value = cat.slug;
  const { error: e } = await supabase
    .from("categories")
    .delete()
    .eq("id", cat.id);
  savingSlug.value = null;
  if (e) {
    error.value = e.message;
    return;
  }
  load();
}

onMounted(load);
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap justify-between items-start gap-3">
      <div>
        <p class="eyebrow text-[10px] uppercase tracking-widest text-gray-500 mb-2">
          Configuracion
        </p>
        <h2 class="text-xl uppercase tracking-widest text-white font-bold mb-2">
          Categorias
        </h2>
        <p class="text-xs text-gray-400 max-w-2xl leading-relaxed">
          Las categorias con <strong class="text-white">"En menu"</strong> activado
          aparecen en el navbar de la web. El <strong class="text-white">orden</strong>
          controla la posicion (menor = primero). El <strong class="text-white">badge</strong>
          es el texto que aparece junto al nombre (ej: NEW pulsando en rojo).
        </p>
      </div>
      <button
        type="button"
        @click="showNewForm = !showNewForm"
        class="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition shrink-0"
      >
        {{ showNewForm ? "Cancelar" : "+ Nueva categoria" }}
      </button>
    </div>

    <p v-if="error" class="text-red-500 text-xs">{{ error }}</p>

    <!-- Formulario nueva categoria -->
    <article
      v-if="showNewForm"
      class="border border-zinc-700 bg-zinc-900/50 p-4 space-y-3"
    >
      <h3 class="text-white text-sm uppercase tracking-widest font-bold">
        Nueva categoria
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div class="md:col-span-3 space-y-1">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">
            Slug (URL) *
          </label>
          <input
            v-model="newCat.slug"
            type="text"
            placeholder="ej: bleach"
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none font-mono"
          />
        </div>
        <div class="md:col-span-3 space-y-1">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">
            Nombre *
          </label>
          <input
            v-model="newCat.name"
            type="text"
            placeholder="ej: Bleach"
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none"
          />
        </div>
        <div class="md:col-span-2 space-y-1">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">
            Orden
          </label>
          <input
            v-model.number="newCat.sort_order"
            type="number"
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none"
          />
        </div>
        <div class="md:col-span-2 space-y-1">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">
            Badge (opcional)
          </label>
          <input
            v-model="newCat.menu_badge"
            type="text"
            placeholder="NEW"
            maxlength="6"
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none uppercase"
          />
        </div>
        <div class="md:col-span-2 flex flex-col gap-1 justify-end pb-1">
          <label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input v-model="newCat.show_in_menu" type="checkbox" class="accent-white" />
            En menu
          </label>
          <label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input v-model="newCat.hide_price" type="checkbox" class="accent-white" />
            Ocultar precio
          </label>
        </div>
      </div>
      <div class="flex justify-end">
        <button
          type="button"
          @click="createCategory"
          :disabled="savingSlug === '__new__'"
          class="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition disabled:opacity-50"
        >
          {{ savingSlug === '__new__' ? 'Creando...' : 'Crear categoria' }}
        </button>
      </div>
    </article>

    <div v-if="loading" class="text-center py-8 text-gray-500 text-xs uppercase tracking-widest">
      Cargando...
    </div>

    <div v-else class="space-y-3">
      <article
        v-for="cat in categories"
        :key="cat.id"
        class="border border-zinc-800 bg-zinc-900/30 p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-start"
      >
        <div class="md:col-span-2">
          <p class="text-[10px] uppercase tracking-widest text-gray-500 mb-1">
            Slug · {{ cat.slug }}
          </p>
          <input
            v-model="cat.name"
            type="text"
            class="w-full bg-transparent border-b border-zinc-700 focus:border-white text-white text-sm font-bold uppercase py-1 outline-none"
          />
        </div>

        <div class="md:col-span-1 space-y-1">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">
            Orden
          </label>
          <input
            v-model.number="cat.sort_order"
            type="number"
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-2 py-2 outline-none text-center"
          />
        </div>

        <div class="md:col-span-2 space-y-1">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">
            Badge menu
          </label>
          <input
            v-model="cat.menu_badge"
            type="text"
            placeholder="—"
            maxlength="6"
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none uppercase"
          />
        </div>

        <div class="md:col-span-2 space-y-1">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">
            Texto en lugar del precio
          </label>
          <input
            v-model="cat.price_label"
            type="text"
            placeholder="Ej: Commission"
            :disabled="!cat.hide_price"
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none disabled:opacity-30"
          />
        </div>

        <div class="md:col-span-3 space-y-1">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">
            Descripcion por defecto
          </label>
          <input
            v-model="cat.default_description"
            type="text"
            placeholder="Pieza unica de…"
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none"
          />
        </div>

        <div class="md:col-span-2 flex flex-col gap-1 items-end">
          <label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input v-model="cat.show_in_menu" type="checkbox" class="accent-white" />
            En menu
          </label>
          <label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input v-model="cat.hide_price" type="checkbox" class="accent-white" />
            Ocultar precio
          </label>
          <div class="flex gap-1.5 mt-1">
            <button
              type="button"
              @click="deleteCategory(cat)"
              :disabled="savingSlug === cat.slug"
              class="px-2 py-1 border border-red-900/40 text-red-400 hover:bg-red-900/30 text-[10px] font-bold uppercase tracking-widest transition disabled:opacity-50"
              title="Borrar categoria"
            >
              ✕
            </button>
            <button
              type="button"
              @click="save(cat)"
              :disabled="savingSlug === cat.slug"
              class="px-3 py-1 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-gray-200 transition disabled:opacity-50"
            >
              {{ savingSlug === cat.slug ? "..." : "Guardar" }}
            </button>
          </div>
        </div>
      </article>
    </div>

    <p class="text-[10px] text-gray-600 leading-relaxed pt-2">
      Los cambios de configuracion se aplican <strong class="text-gray-400">al
      instante</strong> en el shop. Pero <strong class="text-gray-400">los cambios
      de menu</strong> requieren un <em>"Publicar cambios"</em> para que aparezcan
      en el navbar (el menu se construye en el rebuild).
    </p>
  </div>
</template>

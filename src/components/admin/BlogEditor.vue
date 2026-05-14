<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { supabase, type Post, getPostImageUrl } from "../../lib/supabase";
import { uploadPostImage, deletePostImage } from "../../lib/admin";

const posts = ref<Post[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const saving = ref(false);
const uploading = ref(false);

const editing = ref<Post | null>(null);
const showForm = ref(false);
const filterStatus = ref<"all" | "published" | "draft">("all");

const form = ref({
  id: undefined as string | undefined,
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  image: "",
  category: "",
  status: "draft" as "draft" | "published",
  sort_order: 0,
  published_at: null as string | null,
});

const isEdit = computed(() => !!form.value.id);
const slugManual = ref(false);
const slugCheck = ref<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
let slugCheckTimer: ReturnType<typeof setTimeout> | null = null;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

watch(
  () => form.value.title,
  (t) => {
    if (!slugManual.value && t) {
      form.value.slug = slugify(t);
    }
  },
);

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
      let q = supabase.from("posts").select("id").eq("slug", slug).limit(1);
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

const filteredPosts = computed(() => {
  if (filterStatus.value === "all") return posts.value;
  return posts.value.filter((p) => p.status === filterStatus.value);
});

async function load() {
  loading.value = true;
  const { data, error: e } = await supabase
    .from("posts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false });
  if (e) error.value = e.message;
  posts.value = (data ?? []) as Post[];
  loading.value = false;
}

function startNew() {
  editing.value = null;
  slugManual.value = false;
  form.value = {
    id: undefined,
    slug: "",
    title: "",
    excerpt: "",
    content: "",
    image: "",
    category: "",
    status: "draft",
    sort_order: posts.value.length + 1,
    published_at: null,
  };
  showForm.value = true;
}

function startEdit(p: Post) {
  editing.value = p;
  slugManual.value = true; // editamos -> no autosobrescribir
  form.value = {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt ?? "",
    content: p.content ?? "",
    image: p.image ?? "",
    category: p.category ?? "",
    status: p.status,
    sort_order: p.sort_order ?? 0,
    published_at: p.published_at,
  };
  showForm.value = true;
}

async function handleFileUpload(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  uploading.value = true;
  error.value = null;
  try {
    const slugForUpload = form.value.slug || `tmp-${Date.now()}`;
    const { path } = await uploadPostImage(file, slugForUpload);
    // Si habia imagen interna previa, la borramos
    if (form.value.image && !form.value.image.startsWith("/") && !form.value.image.startsWith("http")) {
      await deletePostImage(form.value.image).catch(() => {});
    }
    form.value.image = path;
  } catch (err: any) {
    error.value = err?.message ?? "Error subiendo imagen";
  } finally {
    uploading.value = false;
    target.value = "";
  }
}

async function handleSubmit() {
  if (saving.value) return;
  if (slugCheck.value === "taken") {
    error.value = "El slug ya esta en uso por otro post";
    return;
  }
  if (slugCheck.value === "invalid") {
    error.value = "El slug solo puede tener minusculas, numeros y guiones";
    return;
  }
  saving.value = true;
  error.value = null;

  const payload = {
    slug: form.value.slug.trim(),
    title: form.value.title.trim(),
    excerpt: form.value.excerpt.trim() || null,
    content: form.value.content,
    image: form.value.image || null,
    category: form.value.category.trim() || null,
    status: form.value.status,
    sort_order: Number(form.value.sort_order) || 0,
    published_at:
      form.value.status === "published" && !form.value.published_at
        ? new Date().toISOString()
        : form.value.published_at,
  };

  let dbError;
  if (isEdit.value && form.value.id) {
    const { error: e } = await supabase
      .from("posts")
      .update(payload)
      .eq("id", form.value.id);
    dbError = e;
  } else {
    const { error: e } = await supabase.from("posts").insert(payload);
    dbError = e;
  }

  saving.value = false;
  if (dbError) {
    error.value = dbError.message;
    return;
  }
  showForm.value = false;
  editing.value = null;
  load();
}

async function handleDelete() {
  if (!form.value.id) return;
  if (!confirm("¿Borrar este post permanentemente?")) return;
  saving.value = true;
  // Borrar imagen del bucket si era interna
  if (form.value.image && !form.value.image.startsWith("/") && !form.value.image.startsWith("http")) {
    await deletePostImage(form.value.image).catch(() => {});
  }
  const { error: e } = await supabase.from("posts").delete().eq("id", form.value.id);
  saving.value = false;
  if (e) {
    error.value = e.message;
    return;
  }
  showForm.value = false;
  editing.value = null;
  load();
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

async function togglePublish(p: Post) {
  const newStatus = p.status === "published" ? "draft" : "published";
  const newPublishedAt =
    newStatus === "published" && !p.published_at ? new Date().toISOString() : p.published_at;
  const { error: e } = await supabase
    .from("posts")
    .update({ status: newStatus, published_at: newPublishedAt })
    .eq("id", p.id);
  if (e) error.value = e.message;
  load();
}

onMounted(load);
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap justify-between items-start gap-3">
      <div>
        <p class="text-[10px] uppercase tracking-widest text-gray-500 mb-2">
          Contenido
        </p>
        <h2 class="text-xl uppercase tracking-widest text-white font-bold">
          Blog
        </h2>
        <p class="text-xs text-gray-400 mt-2 max-w-2xl leading-relaxed">
          Los posts <strong class="text-white">publicados</strong> aparecen en
          /blog del sitio. Los <strong class="text-white">borradores</strong>
          quedan ocultos. Necesitas pulsar "Publicar cambios" en el header
          tras crear/editar para que se reflejen en el sitio publico.
        </p>
      </div>
      <button
        v-if="!showForm"
        type="button"
        @click="startNew"
        class="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition shrink-0"
      >
        + Nuevo post
      </button>
    </div>

    <p v-if="error" class="text-red-500 text-xs">{{ error }}</p>

    <!-- ──── FORMULARIO crear/editar ──── -->
    <form
      v-if="showForm"
      @submit.prevent="handleSubmit"
      class="space-y-5 bg-zinc-900/40 border border-zinc-800 p-6"
    >
      <div class="flex justify-between items-start">
        <h3 class="text-white text-sm uppercase tracking-widest font-bold">
          {{ isEdit ? "Editar post" : "Nuevo post" }}
        </h3>
        <button
          type="button"
          @click="showForm = false; editing = null"
          class="text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition"
        >
          ← Volver a la lista
        </button>
      </div>

      <!-- Imagen destacada -->
      <div class="space-y-2">
        <label class="text-[10px] uppercase tracking-widest text-gray-500">
          Imagen destacada
        </label>
        <div v-if="form.image" class="relative group aspect-[3/2] max-w-md bg-black border border-zinc-800">
          <img
            :src="getPostImageUrl(form.image)"
            class="w-full h-full object-cover"
            alt="preview"
          />
          <div class="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/70 flex items-center justify-center transition">
            <button
              type="button"
              @click="form.image = ''"
              class="text-red-400 text-[10px] px-3 py-1 border border-red-400/30 uppercase tracking-widest hover:bg-red-900/30"
            >
              Quitar imagen
            </button>
          </div>
        </div>
        <label
          class="block border-2 border-dashed border-zinc-700 hover:border-white/50 text-center py-6 cursor-pointer transition max-w-md"
        >
          <input
            type="file"
            accept="image/*"
            @change="handleFileUpload"
            class="hidden"
          />
          <span class="text-xs text-gray-500 uppercase tracking-widest">
            {{ uploading ? "Subiendo..." : form.image ? "+ Cambiar imagen" : "+ Subir imagen" }}
          </span>
        </label>
        <p class="text-[10px] text-gray-600">
          JPG / PNG / WebP / AVIF · max 10 MB
        </p>
      </div>

      <!-- Titulo + slug -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-1">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">Título *</label>
          <input
            v-model="form.title"
            type="text"
            required
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none"
            placeholder="Mi nuevo post"
          />
        </div>
        <div class="space-y-1">
          <div class="flex justify-between gap-2">
            <label class="text-[10px] uppercase tracking-widest text-gray-500">Slug (URL) *</label>
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
            @input="slugManual = true"
            type="text"
            required
            pattern="[a-z0-9\-]+"
            class="w-full bg-black border focus:border-white text-white text-sm px-3 py-2 outline-none font-mono"
            :class="slugCheck === 'taken' || slugCheck === 'invalid' ? 'border-red-700' : 'border-zinc-700'"
            placeholder="mi-nuevo-post"
          />
          <p class="text-[10px] text-gray-600 font-mono">
            madcry.com/blog/<span class="text-gray-400">{{ form.slug || "tu-slug" }}</span>
          </p>
        </div>
      </div>

      <!-- Excerpt -->
      <div class="space-y-1">
        <label class="text-[10px] uppercase tracking-widest text-gray-500">
          Extracto (resumen corto para la lista)
        </label>
        <textarea
          v-model="form.excerpt"
          rows="2"
          class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none resize-none"
          placeholder="1-2 frases que resumen el post"
        ></textarea>
      </div>

      <!-- Categoria + orden + estado -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="space-y-1">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">Categoría</label>
          <input
            v-model="form.category"
            type="text"
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none uppercase"
            placeholder="EVENTO · NEWS · BEHIND THE SCENES…"
          />
        </div>
        <div class="space-y-1">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">Orden</label>
          <input
            v-model.number="form.sort_order"
            type="number"
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none"
          />
          <p class="text-[10px] text-gray-600">Menor = primero en /blog</p>
        </div>
        <div class="space-y-1">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">Estado</label>
          <select
            v-model="form.status"
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none"
          >
            <option value="draft">Borrador (oculto)</option>
            <option value="published">Publicado</option>
          </select>
        </div>
      </div>

      <!-- Contenido HTML -->
      <div class="space-y-1">
        <div class="flex justify-between">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">
            Contenido (HTML básico permitido)
          </label>
          <span class="text-[10px] text-gray-600 font-mono">
            &lt;p&gt; &lt;h3&gt; &lt;ul&gt;&lt;li&gt; &lt;strong&gt; &lt;a href&gt; &lt;br&gt;
          </span>
        </div>
        <textarea
          v-model="form.content"
          rows="14"
          class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none font-mono leading-relaxed"
          placeholder="<p>Tu contenido aquí...</p>"
        ></textarea>
        <p class="text-[10px] text-gray-600">
          Escribe HTML directamente. Cada párrafo entre &lt;p&gt;...&lt;/p&gt;.
        </p>
      </div>

      <!-- Botones -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-800">
        <button
          v-if="isEdit"
          type="button"
          @click="handleDelete"
          :disabled="saving"
          class="text-red-400 hover:text-red-300 text-xs uppercase tracking-widest transition"
        >
          Borrar post
        </button>
        <div class="flex gap-3 ml-auto">
          <button
            type="button"
            @click="showForm = false; editing = null"
            class="px-5 py-2 text-xs uppercase tracking-widest text-gray-400 hover:text-white transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="saving || uploading || slugCheck === 'checking' || slugCheck === 'taken' || slugCheck === 'invalid'"
            class="px-6 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear post" }}
          </button>
        </div>
      </div>
    </form>

    <!-- ──── LISTA de posts ──── -->
    <div v-else class="space-y-4">
      <div class="flex gap-2">
        <button
          v-for="f in (['all', 'published', 'draft'] as const)"
          :key="f"
          @click="filterStatus = f"
          :class="[
            'px-3 py-1 text-[10px] uppercase tracking-widest border transition',
            filterStatus === f
              ? 'bg-white text-black border-white'
              : 'border-zinc-700 text-gray-400 hover:text-white',
          ]"
        >
          {{ f === 'all' ? 'Todos' : f === 'published' ? 'Publicados' : 'Borradores' }}
        </button>
      </div>

      <div v-if="loading" class="text-center py-12 text-gray-500 text-xs uppercase tracking-widest">
        Cargando...
      </div>
      <div v-else-if="filteredPosts.length === 0" class="text-center py-12 text-gray-500 text-xs uppercase tracking-widest">
        Sin posts aun.
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <article
          v-for="p in filteredPosts"
          :key="p.id"
          class="border border-zinc-800 bg-zinc-900/20 group"
        >
          <div class="aspect-[3/2] bg-black overflow-hidden">
            <img
              :src="getPostImageUrl(p.image)"
              :alt="p.title"
              class="w-full h-full object-cover"
            />
          </div>
          <div class="p-4 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-white text-sm uppercase tracking-wide font-bold truncate">
                {{ p.title }}
              </h3>
              <span
                :class="[
                  'text-[9px] px-2 py-0.5 uppercase tracking-widest whitespace-nowrap',
                  p.status === 'published' && 'bg-green-900/30 text-green-400',
                  p.status === 'draft' && 'bg-zinc-800 text-gray-500',
                ]"
              >
                {{ p.status === 'published' ? 'Publicado' : 'Borrador' }}
              </span>
            </div>
            <p class="text-gray-400 text-xs">
              {{ p.category || '—' }} · {{ formatDate(p.published_at) }}
            </p>
            <p class="text-gray-500 text-xs line-clamp-2">
              {{ p.excerpt }}
            </p>
            <div class="flex gap-2 pt-2">
              <button
                @click="startEdit(p)"
                class="flex-1 text-[10px] uppercase tracking-widest border border-white/30 text-white py-1 hover:bg-white hover:text-black transition"
              >
                Editar
              </button>
              <button
                @click="togglePublish(p)"
                class="flex-1 text-[10px] uppercase tracking-widest border py-1 transition"
                :class="p.status === 'published'
                  ? 'border-yellow-900/30 text-yellow-400 hover:bg-yellow-900/30'
                  : 'border-green-900/30 text-green-400 hover:bg-green-900/30'"
              >
                {{ p.status === 'published' ? 'Despublicar' : 'Publicar' }}
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

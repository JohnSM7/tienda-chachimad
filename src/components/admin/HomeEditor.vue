<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase, type SiteSettings, getPostImageUrl } from "../../lib/supabase";
import { uploadPostImage } from "../../lib/admin";

const loading = ref(true);
const saving = ref(false);
const uploading = ref(false);
const error = ref<string | null>(null);
const ok = ref(false);

const form = ref<SiteSettings>({
  id: "homepage",
  hero_image: "",
  eyebrow_text: "",
  eyebrow_color: "green",
  title: "",
  subtitle: "",
  description: "",
  cta_label: "",
  cta_url: "",
  cta_note: "",
  footer_top: "",
  footer_bottom: "",
  updated_at: new Date().toISOString(),
});

async function load() {
  loading.value = true;
  const { data, error: e } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", "homepage")
    .maybeSingle();
  if (e) error.value = e.message;
  if (data) form.value = data as SiteSettings;
  loading.value = false;
}

async function handleHeroUpload(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  uploading.value = true;
  error.value = null;
  try {
    // Reusamos el bucket "posts" para imagenes editoriales
    const { path } = await uploadPostImage(file, "homepage");
    form.value.hero_image = path;
  } catch (err: any) {
    error.value = err?.message ?? "Error subiendo imagen";
  } finally {
    uploading.value = false;
    target.value = "";
  }
}

async function save() {
  if (saving.value) return;
  saving.value = true;
  error.value = null;
  ok.value = false;

  const payload = {
    hero_image: form.value.hero_image,
    eyebrow_text: form.value.eyebrow_text,
    eyebrow_color: form.value.eyebrow_color,
    title: form.value.title,
    subtitle: form.value.subtitle,
    description: form.value.description,
    cta_label: form.value.cta_label,
    cta_url: form.value.cta_url,
    cta_note: form.value.cta_note,
    footer_top: form.value.footer_top,
    footer_bottom: form.value.footer_bottom,
  };

  // Upsert por si la fila aun no existiera
  const { error: e } = await supabase
    .from("site_settings")
    .upsert({ id: "homepage", ...payload }, { onConflict: "id" });

  saving.value = false;
  if (e) {
    error.value = e.message;
    return;
  }
  ok.value = true;
  setTimeout(() => (ok.value = false), 4000);
}

onMounted(load);
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="text-[10px] uppercase tracking-widest text-gray-500 mb-2">
        Contenido
      </p>
      <h2 class="text-xl uppercase tracking-widest text-white font-bold">
        Portada (home)
      </h2>
      <p class="text-xs text-gray-400 mt-2 max-w-2xl leading-relaxed">
        Edita la página de inicio. Los cambios se aplican al instante en
        BD pero la home pública requiere un
        <strong class="text-white">"Publicar cambios"</strong> para regenerar
        el HTML estático.
      </p>
    </div>

    <p v-if="error" class="text-red-500 text-xs">{{ error }}</p>
    <p v-if="ok" class="text-green-400 text-xs uppercase tracking-widest">
      ✓ Guardado. Recuerda pulsar "Publicar cambios" para que aparezca en madcry.com
    </p>

    <div v-if="loading" class="text-center py-12 text-gray-500 text-xs uppercase tracking-widest">
      Cargando...
    </div>

    <form
      v-else
      @submit.prevent="save"
      class="space-y-6 bg-zinc-900/40 border border-zinc-800 p-6"
    >
      <!-- Imagen de fondo -->
      <div class="space-y-2">
        <label class="text-[10px] uppercase tracking-widest text-gray-500">
          Imagen de fondo (hero)
        </label>
        <div
          v-if="form.hero_image"
          class="relative group aspect-[16/9] max-w-2xl bg-black border border-zinc-800 overflow-hidden"
        >
          <img
            :src="getPostImageUrl(form.hero_image)"
            class="w-full h-full object-cover opacity-50"
            alt="hero preview"
          />
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span class="text-white text-4xl font-bold uppercase tracking-tighter">
              {{ form.title || "MADCRY" }}
            </span>
          </div>
        </div>
        <label
          class="block border-2 border-dashed border-zinc-700 hover:border-white/50 text-center py-6 cursor-pointer transition max-w-2xl"
        >
          <input
            type="file"
            accept="image/*"
            @change="handleHeroUpload"
            class="hidden"
          />
          <span class="text-xs text-gray-500 uppercase tracking-widest">
            {{ uploading ? "Subiendo..." : form.hero_image ? "+ Cambiar imagen" : "+ Subir imagen" }}
          </span>
        </label>
        <p class="text-[10px] text-gray-600">
          Se mostrará a pantalla completa con un overlay oscuro. Recomendado: orientación horizontal, mínimo 1920×1080.
        </p>
      </div>

      <!-- Eyebrow + color -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="space-y-1 md:col-span-2">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">
            Eyebrow (línea superior pequeña pulsando)
          </label>
          <input
            v-model="form.eyebrow_text"
            type="text"
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none uppercase"
            placeholder="Ya disponible · Coming Soon · 13 de Mayo 2026"
          />
        </div>
        <div class="space-y-1">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">
            Color del eyebrow
          </label>
          <select
            v-model="form.eyebrow_color"
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none"
          >
            <option value="green">Verde (disponible)</option>
            <option value="red">Rojo (urgente/coming)</option>
            <option value="white">Blanco (neutro)</option>
          </select>
        </div>
      </div>

      <!-- Titulo + Subtitulo -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-1">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">
            Título principal (texto gigante)
          </label>
          <input
            v-model="form.title"
            type="text"
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none uppercase"
            placeholder="MADCRY"
          />
        </div>
        <div class="space-y-1">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">
            Subtítulo (línea bajo el título)
          </label>
          <input
            v-model="form.subtitle"
            type="text"
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none uppercase"
            placeholder="Primera Colección"
          />
        </div>
      </div>

      <!-- Descripcion -->
      <div class="space-y-1">
        <label class="text-[10px] uppercase tracking-widest text-gray-500">
          Descripción (debajo del subtítulo)
        </label>
        <textarea
          v-model="form.description"
          rows="2"
          class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none resize-none"
          placeholder="Piezas únicas (1/1) pintadas a mano · Disponibles online"
        ></textarea>
      </div>

      <!-- CTA -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-1">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">
            Texto del botón
          </label>
          <input
            v-model="form.cta_label"
            type="text"
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none"
            placeholder="Ver Colección →"
          />
        </div>
        <div class="space-y-1">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">
            URL del botón
          </label>
          <input
            v-model="form.cta_url"
            type="text"
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none font-mono"
            placeholder="/shop?category=madcry"
          />
        </div>
      </div>

      <div class="space-y-1">
        <label class="text-[10px] uppercase tracking-widest text-gray-500">
          Nota bajo el botón (opcional)
        </label>
        <input
          v-model="form.cta_note"
          type="text"
          class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none uppercase"
          placeholder="Envío gratis a partir de 85 €"
        />
      </div>

      <!-- Footer hero -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
        <div class="space-y-1">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">
            Footer línea 1
          </label>
          <input
            v-model="form.footer_top"
            type="text"
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none uppercase"
            placeholder="MADCRY STUDIO"
          />
        </div>
        <div class="space-y-1">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">
            Footer línea 2
          </label>
          <input
            v-model="form.footer_bottom"
            type="text"
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none uppercase"
            placeholder="MENA - APULIAN FOOD"
          />
        </div>
      </div>

      <div class="flex justify-end pt-4 border-t border-zinc-800">
        <button
          type="submit"
          :disabled="saving || uploading"
          class="px-6 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition disabled:opacity-50"
        >
          {{ saving ? "Guardando..." : "Guardar cambios" }}
        </button>
      </div>
    </form>
  </div>
</template>

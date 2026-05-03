<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase, type Category } from "../../lib/supabase";

interface CategoryRow extends Category {
  price_label?: string | null;
  default_description?: string | null;
  hide_price?: boolean | null;
}

const categories = ref<CategoryRow[]>([]);
const loading = ref(true);
const savingSlug = ref<string | null>(null);
const error = ref<string | null>(null);

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
      price_label: cat.price_label?.trim() || null,
      default_description: cat.default_description?.trim() || null,
      hide_price: !!cat.hide_price,
    })
    .eq("id", cat.id);
  if (e) error.value = e.message;
  savingSlug.value = null;
}

onMounted(load);
</script>

<template>
  <div class="space-y-4">
    <div>
      <p class="eyebrow text-[10px] uppercase tracking-widest text-gray-500 mb-2">
        Configuracion
      </p>
      <h2 class="text-xl uppercase tracking-widest text-white font-bold mb-2">
        Categorias
      </h2>
      <p class="text-xs text-gray-400 max-w-2xl leading-relaxed">
        Activa <strong class="text-white">"Ocultar precio"</strong> para que las piezas
        de esa categoria no muestren importe en la tienda y aparezcan como "por
        encargo". Personaliza el texto que se muestra en lugar del precio
        (<em class="text-gray-300">price label</em>) y la descripcion por defecto
        que aparece cuando una pieza no tiene description propia.
      </p>
    </div>

    <p v-if="error" class="text-red-500 text-xs">{{ error }}</p>

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
          <p class="text-white text-sm font-bold uppercase">{{ cat.name }}</p>
        </div>

        <div class="md:col-span-3 space-y-1">
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

        <div class="md:col-span-5 space-y-1">
          <label class="text-[10px] uppercase tracking-widest text-gray-500">
            Descripcion por defecto (cuando no hay description propia)
          </label>
          <input
            v-model="cat.default_description"
            type="text"
            placeholder="Ej: Pieza unica de Commission."
            class="w-full bg-black border border-zinc-700 focus:border-white text-white text-sm px-3 py-2 outline-none"
          />
        </div>

        <div class="md:col-span-2 flex flex-col gap-2 items-end">
          <label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input
              v-model="cat.hide_price"
              type="checkbox"
              class="accent-white"
            />
            Ocultar precio
          </label>
          <button
            type="button"
            @click="save(cat)"
            :disabled="savingSlug === cat.slug"
            class="px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-gray-200 transition disabled:opacity-50"
          >
            {{ savingSlug === cat.slug ? "Guardando..." : "Guardar" }}
          </button>
        </div>
      </article>
    </div>

    <p class="text-[10px] text-gray-600 leading-relaxed pt-2">
      Los cambios se aplican <strong class="text-gray-400">al instante</strong> en la tienda
      (sin necesidad de "Publicar cambios"). Para piezas concretas que necesiten un
      texto distinto, edita el campo <em>"Descripcion"</em> de cada cuadro.
    </p>
  </div>
</template>

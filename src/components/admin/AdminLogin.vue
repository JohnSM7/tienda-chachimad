<script setup lang="ts">
import { ref } from "vue";
import { signInWithMagicLink } from "../../lib/admin";

const email = ref("");
const sending = ref(false);
const sent = ref(false);
const error = ref<string | null>(null);

async function handleSubmit() {
  if (!email.value || sending.value) return;
  sending.value = true;
  error.value = null;
  try {
    const { error: e } = await signInWithMagicLink(email.value);
    if (e) throw e;
    sent.value = true;
  } catch (e: any) {
    error.value = e?.message ?? "Error enviando enlace";
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-6 pt-24">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center space-y-2">
        <h1 class="text-3xl uppercase tracking-widest text-white font-bold">
          Admin
        </h1>
        <p class="text-xs text-gray-500 uppercase tracking-[0.3em]">
          Acceso solo para Susana
        </p>
      </div>

      <div v-if="!sent" class="space-y-6">
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div class="space-y-2">
            <label class="text-[10px] uppercase tracking-widest text-gray-500">
              Email
            </label>
            <input
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="tu@email.com"
              class="w-full bg-zinc-900 border border-zinc-800 focus:border-white text-white text-sm px-4 py-3 outline-none transition"
            />
          </div>

          <button
            type="submit"
            :disabled="sending"
            class="w-full bg-white text-black px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition disabled:opacity-50"
          >
            {{ sending ? "Enviando..." : "Recibir enlace de acceso" }}
          </button>
        </form>

        <p v-if="error" class="text-red-500 text-xs text-center">{{ error }}</p>

        <p class="text-[10px] text-gray-600 text-center uppercase tracking-widest">
          Te enviaremos un enlace al email. Sin contrasenas.
        </p>
      </div>

      <div v-else class="text-center space-y-4 p-6 border border-green-900/30 bg-green-900/10">
        <p class="text-green-400 text-sm uppercase tracking-widest">Enlace enviado</p>
        <p class="text-gray-400 text-xs">
          Revisa tu email <span class="text-white">{{ email }}</span> y pulsa el enlace.
        </p>
      </div>
    </div>
  </div>
</template>

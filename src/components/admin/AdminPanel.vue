<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  supabase,
  type Product,
  type Order,
  formatPrice,
  getProductImageUrl,
} from "../../lib/supabase";
import { signOut, triggerRebuild } from "../../lib/admin";
import ProductForm from "./ProductForm.vue";

const tab = ref<"products" | "orders" | "messages">("products");

const products = ref<Product[]>([]);
const orders = ref<Order[]>([]);
const messages = ref<any[]>([]);
const loading = ref(true);
const editing = ref<Product | null>(null);
const showForm = ref(false);

const filterStatus = ref<"all" | "available" | "sold" | "draft">("all");
const filteredProducts = computed(() => {
  if (filterStatus.value === "all") return products.value;
  return products.value.filter((p) => p.status === filterStatus.value);
});

const stats = computed(() => ({
  total: products.value.length,
  available: products.value.filter((p) => p.status === "available").length,
  sold: products.value.filter((p) => p.status === "sold").length,
  draft: products.value.filter((p) => p.status === "draft").length,
  paidOrders: orders.value.filter((o) => o.status === "paid").length,
  pendingOrders: orders.value.filter((o) => o.status === "pending").length,
  unreadMessages: messages.value.filter((m) => !m.read).length,
  totalRevenue: orders.value
    .filter((o) => ["paid", "shipped", "delivered"].includes(o.status))
    .reduce((acc, o) => acc + (o.amount_total_cents ?? 0), 0),
}));

const rebuildState = ref<"idle" | "loading" | "ok" | "error">("idle");

async function loadAll() {
  loading.value = true;
  const [pRes, oRes, mRes] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);
  products.value = (pRes.data ?? []) as Product[];
  orders.value = (oRes.data ?? []) as Order[];
  messages.value = mRes.data ?? [];
  loading.value = false;
}

function startNew() {
  editing.value = null;
  showForm.value = true;
}
function startEdit(p: Product) {
  editing.value = p;
  showForm.value = true;
}
function onSaved() {
  showForm.value = false;
  editing.value = null;
  loadAll();
}

async function quickStatus(p: Product, status: "available" | "sold") {
  const { error } = await supabase
    .from("products")
    .update({ status })
    .eq("id", p.id);
  if (!error) loadAll();
}

async function markOrderShipped(o: Order) {
  const tracking = prompt("Numero de seguimiento (opcional):");
  const carrier = tracking ? prompt("Empresa (Correos, SEUR, MRW...):") : null;
  await supabase
    .from("orders")
    .update({
      status: "shipped",
      tracking_number: tracking || null,
      carrier: carrier || null,
      shipped_at: new Date().toISOString(),
    })
    .eq("id", o.id);
  loadAll();
}

async function markMessageRead(m: any) {
  await supabase.from("messages").update({ read: true }).eq("id", m.id);
  loadAll();
}

async function publishSite() {
  rebuildState.value = "loading";
  try {
    await triggerRebuild();
    rebuildState.value = "ok";
    setTimeout(() => (rebuildState.value = "idle"), 5000);
  } catch (e) {
    console.error(e);
    rebuildState.value = "error";
    setTimeout(() => (rebuildState.value = "idle"), 5000);
  }
}

async function logout() {
  await signOut();
  location.href = "/admin";
}

onMounted(loadAll);
</script>

<template>
  <div class="min-h-screen pt-32 px-4 max-w-7xl mx-auto pb-16">
    <header class="flex flex-wrap justify-between items-center gap-4 mb-8 pb-4 border-b border-zinc-800">
      <h1 class="text-2xl uppercase tracking-widest text-white font-bold">
        Panel Admin
      </h1>
      <div class="flex items-center gap-3">
        <button
          @click="publishSite"
          :disabled="rebuildState === 'loading'"
          class="px-4 py-2 text-[10px] uppercase tracking-widest border border-white/30 text-white hover:bg-white hover:text-black transition disabled:opacity-50"
          :class="{
            'border-green-500 text-green-400': rebuildState === 'ok',
            'border-red-500 text-red-400': rebuildState === 'error',
          }"
        >
          {{
            rebuildState === "loading"
              ? "Publicando..."
              : rebuildState === "ok"
                ? "✓ Rebuild iniciado"
                : rebuildState === "error"
                  ? "Error"
                  : "Publicar cambios"
          }}
        </button>
        <button
          @click="logout"
          class="text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition"
        >
          Salir
        </button>
      </div>
    </header>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="border border-zinc-800 bg-zinc-900/30 p-4">
        <p class="text-[10px] text-gray-500 uppercase tracking-widest">Disponibles</p>
        <p class="text-3xl text-white font-bold mt-1">{{ stats.available }}</p>
      </div>
      <div class="border border-zinc-800 bg-zinc-900/30 p-4">
        <p class="text-[10px] text-gray-500 uppercase tracking-widest">Vendidos</p>
        <p class="text-3xl text-white font-bold mt-1">{{ stats.sold }}</p>
      </div>
      <div class="border border-zinc-800 bg-zinc-900/30 p-4">
        <p class="text-[10px] text-gray-500 uppercase tracking-widest">
          Pedidos pagados
        </p>
        <p class="text-3xl text-white font-bold mt-1">{{ stats.paidOrders }}</p>
      </div>
      <div class="border border-zinc-800 bg-zinc-900/30 p-4">
        <p class="text-[10px] text-gray-500 uppercase tracking-widest">Ingresos</p>
        <p class="text-3xl text-white font-bold mt-1">
          {{ formatPrice(stats.totalRevenue) }}
        </p>
      </div>
    </div>

    <!-- Tabs -->
    <nav class="flex gap-6 mb-6 text-xs uppercase tracking-widest border-b border-zinc-800">
      <button
        v-for="t in (['products', 'orders', 'messages'] as const)"
        :key="t"
        @click="tab = t"
        :class="[
          'pb-3 -mb-px border-b-2 transition',
          tab === t ? 'border-white text-white' : 'border-transparent text-gray-500 hover:text-white',
        ]"
      >
        {{
          t === "products"
            ? "Cuadros"
            : t === "orders"
              ? `Pedidos (${stats.pendingOrders + stats.paidOrders})`
              : `Mensajes (${stats.unreadMessages})`
        }}
      </button>
    </nav>

    <!-- ========== PRODUCTS ========== -->
    <section v-if="tab === 'products'" class="space-y-6">
      <div v-if="showForm">
        <ProductForm
          :product="editing"
          @saved="onSaved"
          @cancel="showForm = false; editing = null"
        />
      </div>

      <div v-else class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex gap-2">
            <button
              v-for="f in (['all', 'available', 'sold', 'draft'] as const)"
              :key="f"
              @click="filterStatus = f"
              :class="[
                'px-3 py-1 text-[10px] uppercase tracking-widest border transition',
                filterStatus === f
                  ? 'bg-white text-black border-white'
                  : 'border-zinc-700 text-gray-400 hover:text-white',
              ]"
            >
              {{
                f === "all"
                  ? "Todos"
                  : f === "available"
                    ? "Disponibles"
                    : f === "sold"
                      ? "Vendidos"
                      : "Borrador"
              }}
            </button>
          </div>
          <button
            @click="startNew"
            class="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition"
          >
            + Nuevo cuadro
          </button>
        </div>

        <div v-if="loading" class="text-center py-12 text-gray-500 text-xs uppercase tracking-widest">
          Cargando...
        </div>
        <div v-else-if="filteredProducts.length === 0" class="text-center py-12 text-gray-500 text-xs uppercase tracking-widest">
          Sin cuadros aun.
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <article
            v-for="p in filteredProducts"
            :key="p.id"
            class="border border-zinc-800 bg-zinc-900/20 group"
          >
            <div class="aspect-square bg-black overflow-hidden">
              <img
                :src="getProductImageUrl(
                  Array.isArray(p.images) && p.images.length > 0
                    ? String(p.images[0])
                    : null
                )"
                :alt="p.name"
                class="w-full h-full object-cover"
              />
            </div>
            <div class="p-4 space-y-2">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-white text-sm uppercase tracking-wide font-bold truncate">
                  {{ p.name }}
                </h3>
                <span
                  :class="[
                    'text-[9px] px-2 py-0.5 uppercase tracking-widest',
                    p.status === 'available' && 'bg-green-900/30 text-green-400',
                    p.status === 'sold' && 'bg-red-900/30 text-red-400',
                    p.status === 'draft' && 'bg-zinc-800 text-gray-500',
                    p.status === 'reserved' && 'bg-yellow-900/30 text-yellow-400',
                  ]"
                >
                  {{ p.status }}
                </span>
              </div>
              <p class="text-gray-400 text-xs">
                {{ formatPrice(p.price_cents, p.currency || "eur") }} · {{ p.category_slug }}
              </p>

              <div class="flex gap-2 pt-2">
                <button
                  @click="startEdit(p)"
                  class="flex-1 text-[10px] uppercase tracking-widest border border-white/30 text-white py-1 hover:bg-white hover:text-black transition"
                >
                  Editar
                </button>
                <button
                  v-if="p.status === 'available'"
                  @click="quickStatus(p, 'sold')"
                  class="flex-1 text-[10px] uppercase tracking-widest border border-red-900/30 text-red-400 py-1 hover:bg-red-900/30 transition"
                >
                  Sold
                </button>
                <button
                  v-else-if="p.status === 'sold'"
                  @click="quickStatus(p, 'available')"
                  class="flex-1 text-[10px] uppercase tracking-widest border border-green-900/30 text-green-400 py-1 hover:bg-green-900/30 transition"
                >
                  Reactivar
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ========== ORDERS ========== -->
    <section v-if="tab === 'orders'" class="space-y-4">
      <div v-if="loading" class="text-center py-12 text-gray-500 text-xs uppercase tracking-widest">
        Cargando...
      </div>
      <div v-else-if="orders.length === 0" class="text-center py-12 text-gray-500 text-xs uppercase tracking-widest">
        Sin pedidos aun.
      </div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-[10px] uppercase tracking-widest text-gray-500 border-b border-zinc-800">
            <th class="text-left py-3 px-2">Fecha</th>
            <th class="text-left py-3 px-2">Cliente</th>
            <th class="text-left py-3 px-2">Total</th>
            <th class="text-left py-3 px-2">Estado</th>
            <th class="text-left py-3 px-2">Tracking</th>
            <th class="text-right py-3 px-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="o in orders"
            :key="o.id"
            class="border-b border-zinc-900 hover:bg-zinc-900/30"
          >
            <td class="py-3 px-2 text-xs text-gray-400">
              {{ new Date(o.created_at!).toLocaleDateString("es-ES") }}
            </td>
            <td class="py-3 px-2 text-xs text-white">
              <div>{{ o.customer_name || "—" }}</div>
              <div class="text-gray-500">{{ o.customer_email }}</div>
            </td>
            <td class="py-3 px-2 text-xs text-white font-bold">
              {{ formatPrice(o.amount_total_cents) }}
            </td>
            <td class="py-3 px-2">
              <span
                :class="[
                  'text-[9px] px-2 py-0.5 uppercase tracking-widest',
                  o.status === 'paid' && 'bg-blue-900/30 text-blue-400',
                  o.status === 'shipped' && 'bg-yellow-900/30 text-yellow-400',
                  o.status === 'delivered' && 'bg-green-900/30 text-green-400',
                  o.status === 'pending' && 'bg-zinc-800 text-gray-500',
                  o.status === 'refunded' && 'bg-red-900/30 text-red-400',
                  o.status === 'cancelled' && 'bg-zinc-800 text-gray-500',
                ]"
              >
                {{ o.status }}
              </span>
            </td>
            <td class="py-3 px-2 text-xs text-gray-400">
              {{ o.tracking_number || "—" }}
            </td>
            <td class="py-3 px-2 text-right">
              <button
                v-if="o.status === 'paid'"
                @click="markOrderShipped(o)"
                class="text-[10px] uppercase tracking-widest text-white border border-white/30 px-2 py-1 hover:bg-white hover:text-black transition"
              >
                Marcar enviado
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- ========== MESSAGES ========== -->
    <section v-if="tab === 'messages'" class="space-y-4">
      <div v-if="loading" class="text-center py-12 text-gray-500 text-xs uppercase tracking-widest">
        Cargando...
      </div>
      <div v-else-if="messages.length === 0" class="text-center py-12 text-gray-500 text-xs uppercase tracking-widest">
        Sin mensajes.
      </div>
      <article
        v-else
        v-for="m in messages"
        :key="m.id"
        class="border p-4 transition"
        :class="m.read ? 'border-zinc-800 bg-zinc-900/20 opacity-60' : 'border-zinc-700 bg-zinc-900/40'"
      >
        <header class="flex flex-wrap justify-between items-center gap-2 mb-2">
          <div class="flex items-center gap-3">
            <span class="text-[10px] uppercase tracking-widest text-gray-500">
              {{ new Date(m.created_at).toLocaleString("es-ES") }}
            </span>
            <span class="text-[9px] px-2 py-0.5 uppercase tracking-widest bg-zinc-800 text-gray-400">
              {{ m.type }}
            </span>
          </div>
          <button
            v-if="!m.read"
            @click="markMessageRead(m)"
            class="text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition"
          >
            Marcar leido
          </button>
        </header>
        <h3 class="text-white text-sm">
          {{ m.name }}
          <a
            :href="`mailto:${m.email}`"
            class="text-gray-400 hover:text-white text-xs ml-2"
            >&lt;{{ m.email }}&gt;</a
          >
        </h3>
        <p v-if="m.budget" class="text-xs text-gray-500 mt-1">
          Presupuesto: {{ m.budget }}
        </p>
        <p class="text-sm text-gray-300 mt-3 whitespace-pre-line">
          {{ m.message }}
        </p>
      </article>
    </section>
  </div>
</template>

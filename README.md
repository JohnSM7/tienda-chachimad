# 🎨 [MADCRY STUDIO]

![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel&style=flat-square)
![Status](https://img.shields.io/badge/Status-Active-success?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

> Una plataforma de comercio electrónico moderna para la venta de obras de arte exclusivas.

## 📋 Descripción

Este proyecto es una web desarrollada con tecnologías modernas de JavaScript, diseñada para ser rápida, escalable y fácil de mantener. El despliegue se realiza automáticamente a través de Vercel.

## 🚀 Tecnologías

* **Framework:** Astro
* **Estilos:** CSS Modules / Tailwind CSS
* **Despliegue:** Vercel/Firebase
* **Pagos:** Integración preparada para Stripe (En construcción)

---

## 🛠️ Instalación y Configuración Local

Sigue estos pasos para levantar el proyecto en tu máquina local:

1.  **Clonar el repositorio:**
    ```bash
    git clone [https://github.com/tu-usuario/tu-proyecto.git](https://github.com/tu-usuario/tu-proyecto.git)
    cd tu-proyecto
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    # o si usas yarn
    yarn install
    ```

3.  **Iniciar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```

4.  Abrir `http://localhost:3000` en tu navegador.

---

## 🖼️ Gestión de Imágenes y Assets (Importante)

Para garantizar que las imágenes se vean correctamente tanto en local como en producción (Vercel), seguimos una convención estricta sobre el uso de la carpeta `public`.

### La Regla de la Carpeta `public`

Cualquier archivo colocado dentro de la carpeta `/public` debe ser referenciado desde la raíz `/` del dominio, **sin** incluir la palabra "public" en la ruta y **sin** usar rutas relativas (`../`).

### ❌ Forma Incorrecta (No funciona en Vercel)
El navegador intentará buscar fuera de la raíz del servidor, lo cual está bloqueado.
```javascript
image: "../public/images/LuffyGang.jpeg" // Error 404
✅ Forma Correcta
Vercel sirve el contenido de public directamente en la base del dominio.

JavaScript

image: "/images/LuffyGang.jpeg" // Correcto
⚠️ Nota sobre Mayúsculas (Case Sensitivity)
Los servidores de Vercel usan Linux, que distingue mayúsculas de minúsculas.

Si el archivo es foto.jpg y pides Foto.jpg -> Fallará.

Asegúrate de que la extensión (.jpg, .png, .jpeg) coincida exactamente.

## 📦 Estructura de Datos (Ejemplo)
Los productos se gestionan en un array de objetos. Asegúrate de seguir este esquema para añadir nuevos items:

JavaScript

export const products = [
    {
        id: "demo-1",
        name: "Luffy Gangsta",
        price: 35,
        status: "available",
        image: "/images/LuffyGang.jpeg", // Ruta absoluta desde public
        stripeLink: "#",
        description: "Obra con brillos en los dientes de Luffy Gear 5"
    }
];

---

## ☁️ Despliegue en Vercel
El proyecto está configurado para despliegue continuo (CI/CD).

Sube tus cambios a GitHub:

Bash

git add .
git commit -m "feat: nuevos productos añadidos"
git push origin main
Vercel detectará el commit automáticamente y comenzará el "Build".

En unos minutos, los cambios estarán visibles en la URL de producción.

---

## 📄 Licencia
Este proyecto está bajo la licencia MIT. Consulta el archivo LICENSE para más detalles.

Hecho con ❤️ por [Susana Juan Madriz y John Sandoval]
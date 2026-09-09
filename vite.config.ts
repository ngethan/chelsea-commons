import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'


const config = defineConfig({
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
        // The admin and its sign-in page are private and depend on a session,
        // so there is nothing to prerender and a build-time render would only
        // bake in a signed-out shell. Neither is linked from a public page, so
        // crawlLinks would not reach them today; this keeps that from becoming
        // true by accident the first time somebody adds a link.
        filter: ({ path }: { path: string }) =>
          !path.startsWith('/admin') && !path.startsWith('/sign-in'),
        autoSubfolderIndex: true,
        concurrency: 14,
        crawlLinks: true,
        retryCount: 2,
        retryDelay: 1000,
        onSuccess: ({ page }) => {
          console.log(`Rendered ${page.path}!`)
        },
      },
    }),
    viteReact(),
    nitro(
      { config: { preset: 'vercel' } }
    )
    ],
  server: {
    allowedHosts: ["chelseacommons.co", "www.chelseacommons.co"]
  },
  ssr: {
    noExternal: ['katex', 'streamdown']
  }
})

export default config

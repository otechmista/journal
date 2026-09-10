# Journal app

SvelteKit static reader for Journal. The canonical commands live at the repository root so the app and public JSON data stay in sync.

```sh
cd ..
npm run bootstrap
npm run dev
npm run check:app
```

Direct app commands still work after dependencies are installed, but they do not refresh `app/static/data`:

```sh
npm run dev
npm run build
npm run preview
```

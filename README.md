
# McKay Maille Studio

## Overview

McKay Maille Studio is an interactive chainmaille colour designer. Pick a weave, select one or more rings, try colours, rotate the 3D preview, and share the finished design with a link.

## Run locally

You will need [Node.js](https://nodejs.org/) 20 or newer and npm.

```sh
git clone <repository-url>
cd mckay-maille-studio
npm install
npm run dev
```

Open the local URL printed by Vite, normally <http://localhost:5173>.

To check the production build locally:

```sh
npm run build
npm run preview
```

To run the application as a local server available to other machines on your network:

```sh
npm run dev -- --host 0.0.0.0 --port 5174
```


## Trying the app

1. Choose a weave from the home page.
2. Click or tap a ring to select it. On desktop, Shift-click adds rings and Ctrl-click or Command-click removes them.
3. Choose a colour, rotate or zoom the model, and try Undo and Reset.
4. Use Share and confirm that the copied link opens the same design.

The app requires a modern browser with WebGL enabled. When reporting a problem, please include the browser and device you used, what you expected, and what happened instead.

## Adding models

Add the GLB to `models/`, then add its display name, editable subtitle, blog post URL, filenames, ring count, and groups to `models/_model_config.json`.

Run `npm run thumbnails` to generate every thumbnail, or `npm run thumbnails -- model_id` to generate one.

Run `npm run count-rings -- model_id` to count the rings in a model. A GLB filename or filename without the `.glb` extension also works; omit the model to count every GLB in the `models` directory.

## Ring groups

While running `npm run dev`, open `/group-editor/model_id` to visually create and edit related-ring groups. Download the result and replace `models/_model_config.json`. The authoring route is excluded from production builds.

## AI disclosure

This project was vibe coded with OpenAI Codex as an experiment in building something with technologies the project owner is still learning. The project owner provided the ideas, requirements, visual direction, hands-on testing, and configuration changes, while AI generated and revised the code and documentation. The project is a static site, handles no sensitive information, and is evaluated through hands-on testing rather than source-code review.

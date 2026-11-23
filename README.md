# Support2Sim project frontend

Static, anonymous project page for **Support2Sim: Visually Faithful Real2Sim with Stable Object Supports**. No build step, packages, frameworks, analytics, remote fonts, or CDN dependencies. All frontend files live directly in this directory; there is no nested `site/` directory.

## Files and integration

- `index.html`: accessible page structure and a static overview containing the supplied measured results.
- `styles.css`: responsive layout, system font stack, purple `#755188` and teal `#165D55` accents.
- `app.js`: manifest loading, media rendering, synchronized rollouts, and interactive scenes.
- `.nojekyll`: serves the directory as static files on GitHub Pages.
- `data/site-content.json`: **provided by the main agent**, using the schema below.
- `assets/`: **provided by the asset agent**. The frontend does not read `data/media-catalog.json` directly; adapt that catalog into `site-content.json`.
- `vendor/model-viewer.min.js`: **provided by the main agent**, with its license. The frontend expects the locally vendored model-viewer web component (4.4.0).

The root directory is ready to be served from either a domain root or a GitHub Pages project subpath. For a local preview, run `python3 -m http.server 8000 --directory support2sim_site` from its parent directory and open `http://localhost:8000`. Opening `index.html` with a `file:` URL will not load the JSON manifest. Repository creation, GitHub Pages configuration, publication, and browser QA belong to the main agent.

## Manifest contract

Use a JSON object with `schemaVersion: 1`. Every top-level content section is optional. Unknown fields are ignored. The following example documents the shape; **paths are examples of the contract, not bundled assets or claimed available results**. Include only paths to real files and only captions supported by the paper or saved artifacts.

```json
{
  "schemaVersion": 1,
  "subtitle": "From one image to a scene that holds together.",
  "summary": "Support2Sim reconstructs a simulation scene from a single image, combining visual reconstruction with stable object supports. We evaluate source fidelity, support realization, and scene stability across 50 scenes from four datasets.",
  "hero": {
    "source": {
      "src": "assets/hero/source.jpg",
      "alt": "Describe the objects and their supports in this source RGB image."
    },
    "simulation": {
      "type": "video",
      "src": "assets/hero/support2sim.mp4",
      "poster": "assets/hero/poster.jpg",
      "alt": "Describe the reconstruction and what happens during this saved simulation."
    },
    "caption": "Caption grounded in this saved example.",
    "autoplay": true
  },
  "results": {
    "intro": "50 scenes. Four datasets. Visual fidelity, realized supports, and stability after release.",
    "metrics": [
      {
        "label": "Source-mask IoU",
        "baseline": "30.3",
        "value": "51.7",
        "unit": "%",
        "detail": "After 10 seconds",
        "gain": "+21.4 percentage points"
      },
      {
        "label": "Intended supports",
        "baseline": "73.2",
        "value": "87.1",
        "unit": "%",
        "detail": "Realization rate"
      },
      {
        "label": "Mean object drift",
        "baseline": "79.6",
        "value": "45.3",
        "unit": " mm"
      }
    ],
    "note": "Optional measurement protocol or aggregation note, taken from the evaluated results.",
    "source": {
      "src": "assets/results/source.jpg",
      "alt": "Describe the original RGB scene."
    },
    "simulation": {
      "type": "video",
      "src": "assets/results/support2sim.mp4",
      "poster": "assets/results/poster.jpg",
      "alt": "Describe the corresponding Support2Sim simulation."
    },
    "caption": "Optional caption for the paired RGB and reconstruction."
  },
  "rollouts": {
    "description": "Compare saved rollouts beside the source RGB image. Playback and seeking are linked across the visible methods.",
    "note": "Optional note identifying the recorded interval and comparison protocol.",
    "scenes": [
      {
        "id": "unique-scene-id",
        "title": "Human-readable scene name",
        "dataset": "Dataset name",
        "source": {
          "src": "assets/scene/source.jpg",
          "alt": "Describe the source objects, arrangement, and supports."
        },
        "videos": [
          {
            "method": "Support2Sim",
            "src": "assets/scene/support2sim.mp4",
            "poster": "assets/scene/support2sim.jpg",
            "alt": "Support2Sim saved rollout for this scene."
          },
          {
            "method": "SimFoundry",
            "src": "assets/scene/simfoundry.mp4",
            "poster": "assets/scene/simfoundry.jpg",
            "alt": "SimFoundry saved rollout for this scene."
          },
          {
            "method": "PCR",
            "src": "assets/scene/pcr.mp4",
            "poster": "assets/scene/pcr.jpg",
            "alt": "PCR saved rollout for this scene."
          }
        ]
      }
    ]
  },
  "viewer": {
    "description": "Inspect the textured reconstruction in 3D, with the original image alongside. Choose a scene, then load its interactive model.",
    "models": [
      {
        "id": "unique-model-id",
        "label": "Human-readable scene name",
        "dataset": "Dataset name",
        "src": "assets/scene/scene.glb",
        "poster": "assets/scene/model-poster.jpg",
        "alt": "Describe the textured scene and spatial arrangement available to explore.",
        "source": {
          "src": "assets/scene/source.jpg",
          "alt": "Describe the original RGB view of this reconstructed scene."
        },
        "caption": "Optional grounded scene or viewing note.",
        "cameraOrbit": "auto auto auto",
        "cameraTarget": "auto auto auto",
        "fieldOfView": "auto"
      }
    ]
  },
  "policy": {
    "summary": "Policy learning in reconstructed simulation scenes.",
    "meanSuccess": "91%",
    "metricLabel": "mean success",
    "note": "Optional note describing the actual evaluated tasks and aggregation.",
    "tasks": [
      {
        "title": "Evaluated task name",
        "video": {
          "src": "assets/policy/task.mp4",
          "poster": "assets/policy/task.jpg",
          "alt": "Describe the action shown in this saved policy rollout."
        },
        "image": {
          "src": "assets/policy/task.jpg",
          "alt": "Describe this task image; do not describe it as a video."
        },
        "caption": "Grounded task description."
      }
    ]
  },
  "method": {
    "description": "Optional concise explanation grounded in the actual method.",
    "image": {
      "src": "assets/method/overview.png",
      "alt": "Describe the full method diagram and the order of its stages.",
      "caption": "Optional diagram caption."
    },
    "steps": [
      { "title": "Actual stage name", "description": "Actual stage description." }
    ]
  }
}
```

### Field behavior

| Field | Required for display | Behavior |
| --- | --- | --- |
| `subtitle`, `summary` | No | Override the corresponding static text; title and branding stay fixed. Plain text only. |
| `hero` | Both `source.src` and `simulation.src` | Two large adjacent panels. Source is an image; simulation can be an image or video. `autoplay: true` applies only to this video, only while reduced motion is off. Default is no autoplay. |
| `results.metrics[]` | `label`, `baseline`, `value` as strings | `baseline` is SimFoundry and `value` is Support2Sim. Optional `unit`, `detail`, and Support2Sim `gain` text. Omit `metrics` to use the static comparison table. Use `[]` to hide the table. |
| `results.source`, `results.simulation` | Both `src` values | Optional large RGB/result pair below the measured results; same media format as the hero. |
| `rollouts.scenes[]` | `source.src`, at least one valid `videos[]` entry | Use unique stable `id` values, readable `title`, and consistent `dataset` names. Dataset buttons are generated from available scenes and hidden if only one dataset is present. |
| `rollouts.scenes[].videos[]` | `src`, `method` | Allowed method labels: `Support2Sim`, `SimFoundry`, `PCR`, `Picasso`, `SAM3D`, `SAM3D+FP`. Other labels are omitted. Array order controls panel order; put Support2Sim first. Three methods per representative are supported, as are other available counts. |
| `viewer.models[]` | Local `src` and local `poster` | `label`, `alt`, and `source` are strongly recommended. `dataset`, `caption`, and camera strings are optional. No mesh or viewer library is fetched before the visitor clicks Load interactive scene. |
| `policy.tasks[]` | A `video.src` or `image.src` | Supply the four actual tasks. The layout supports any available count without placeholders. Video takes priority; a missing/failed video falls back to its image, labeled **Task image**. Image-only tasks must omit the `video` property. |
| `policy.meanSuccess` | A string such as `"91%"` | Displayed only when supplied and at least one task is available. No scores are inferred from media. |
| `multiview.scenes[]` | `video.src` | A scene `title` and a video with optional `poster` and `alt`. The section shows a native player for each scene, and the videos load on demand. |
| `method` | `image.src` | Full-width overview image. `steps` is optional; only entries with both title and description are shown. |

### Shared media fields

`src` is a relative local path, such as `assets/scene/rollout.mp4`; it is never a remote URL. Absolute paths, protocol URLs, path traversal, query strings, and fragments are rejected. All paths resolve from this frontend directory, **not** from `data/`. Use ASCII filenames with hyphens when practical. JSON strings are inserted as text, not HTML.

Image fields: `{ "src": "assets/image.jpg", "alt": "Specific visual description", "caption": "Optional caption" }`.

Video fields: `{ "src": "assets/clip.mp4", "poster": "assets/poster.jpg", "alt": "Specific action description", "caption": "Optional caption" }`. `alt` becomes the video's accessible label. All videos have native controls, are muted, use `playsinline`, and request only metadata initially. Only the explicitly enabled hero may autoplay. Video extension inference recognizes `.mp4`, `.webm`, and `.ogv`; specify `type: "video"` for other formats in paired media. Policy and rollout video fields are always treated as videos. A poster is optional but recommended.

Videos may include local WebVTT captions:

```json
"tracks": [
  { "src": "assets/captions/clip.en.vtt", "lang": "en", "label": "English", "default": true }
]
```

If a section has no usable asset descriptors, it and its navigation link stay hidden. A failed image or video is removed from its media area. A failed paired source/result hides the pair. A failed model retains its accessible poster and offers retry. If the manifest is absent, malformed, or unsupported, the supplied static title, summary, and measured results remain visible; empty explorers do not appear.

### Synchronized rollout contract

Encode comparisons on the **same simulation timeline**, with matching start events. The site synchronizes saved playback time; it does not retime trajectories or claim equivalent experiment settings. Native play, pause, seek, and rate controls are linked across visible methods. The shared scrubber and Reset affect all visible methods. Playback stops at the shortest loaded clip's duration. Drift over approximately 180 ms is corrected during playback; this is a visual comparison interface, not frame-exact scientific measurement. Changing a dataset or scene pauses the old videos. Backgrounding the page pauses comparison playback.

### 3D asset contract

Supply self-contained, textured **GLB** files with embedded textures and no compression that requires remote decoders. Ordinary local `.gltf` with local buffers/textures also works, but self-contained GLB is preferable. No Draco, Meshopt, or KTX2 decoder downloads are configured. The content security policy prevents external network requests, including any decoder CDN fallback.

The local component is loaded only on user action. The viewer uses `camera-controls`, neutral built-in environment lighting, `shadow-intensity="0.6"`, and `exposure="1"`. It does not auto-rotate. Optional camera values follow model-viewer's units (`"45deg 65deg 3m"`, `"0m 0.4m 0m"`, `"35deg"`, or `"auto"` values). Camera buttons support keyboard operation in addition to the component's own controls; reduced-motion preference disables camera interpolation. Selecting a new model restores its poster and waits for a new explicit load action.

## Content boundaries

Keep public copy and assets anonymous: no author names, institutions, email addresses, personal GitHub accounts, or submission status. No paper, arXiv, supplementary, or repository links are generated. Add no links to publications that have not been supplied and approved. The page does not alter or link itself from the paper. Aggregate measurements are the supplied results; representative examples must be identified through accurate captions, not treated as evidence for additional unmeasured claims.

## Verification handoff

Browser QA should use the real manifest and assets: check all four dataset filters, play/pause/reset and native seeking, a switch during playback, shorter/missing clips, all models (including failure/retry), image-only policy tasks, reduced motion, keyboard traversal, and narrow mobile widths. The source and result stay adjacent on wide displays and stack in reading order on small screens. Missing assets never generate stock imagery or synthetic examples.

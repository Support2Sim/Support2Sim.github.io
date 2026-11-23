/* Support2Sim — buildless, local-asset-only project page. See README.md for data. */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const list = (value) => Array.isArray(value) ? value : [];
  const string = (value, fallback = "") => typeof value === "string" && value.trim() ? value.trim() : fallback;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const methods = new Set(["Support2Sim", "SimFoundry", "PCR", "Picasso", "SAM3D", "SAM3D+FP"]);

  // Relative URLs preserve GitHub Pages project prefixes. Reject remote URLs,
  // traversal, and encoded protocol/path tricks before assigning any asset URL.
  function localPath(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    const path = value.trim();
    let decoded;
    try { decoded = decodeURIComponent(path); } catch { return ""; }
    if (/^[/.]{2}\/|^\/|[\\:#?\u0000-\u001f]/.test(decoded)) return "";
    if (decoded.split("/").some((part) => part === "..")) return "";
    return path;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function setText(id, value) {
    const text = string(value);
    if (text) $(id).textContent = text;
  }

  function optionalText(id, value) {
    const node = $(id);
    node.textContent = string(value);
    node.hidden = !node.textContent;
  }

  function showSection(id, show) {
    $(id).hidden = !show;
    const link = document.querySelector(`[data-nav="${id}"]`);
    if (link) link.hidden = !show;
  }

  function mediaData(value, forcedType) {
    const data = object(value);
    const src = localPath(data.src);
    if (!src) return null;
    const type = forcedType || (data.type === "video" || /\.(mp4|webm|ogv)$/i.test(src) ? "video" : "image");
    return { ...data, src, type };
  }

  function makeMedia(value, options = {}) {
    const data = mediaData(value, options.type);
    if (!data) return null;
    const figure = element("figure", `media-figure${options.primary ? " is-primary" : ""}`);
    const heading = element("figcaption", "media-heading");
    if (options.label) heading.append(element("span", "media-label", options.label));
    if (options.method) heading.append(element("span", "method-label", options.method));
    if (heading.childNodes.length) figure.append(heading);
    const frame = element("div", "media-frame");
    const media = element(data.type === "video" ? "video" : "img");
    const alt = string(data.alt, options.alt || options.label || "Reconstructed scene");
    if (data.type === "video") {
      media.controls = true;
      media.muted = true;
      media.defaultMuted = true;
      media.playsInline = true;
      media.preload = options.preload || "metadata";
      media.setAttribute("muted", "");
      media.setAttribute("playsinline", "");
      media.setAttribute("aria-label", alt);
      const poster = localPath(data.poster);
      if (poster) media.poster = poster;
      media.append(document.createTextNode("Your browser cannot play this video."));
      list(data.tracks).forEach((trackData) => {
        const track = object(trackData);
        const src = localPath(track.src);
        if (!src) return;
        const node = element("track");
        node.kind = "captions";
        node.src = src;
        node.srclang = string(track.lang, "en");
        node.label = string(track.label, "Captions");
        node.default = track.default === true;
        media.append(node);
      });
    } else {
      media.alt = alt;
      media.loading = options.eager ? "eager" : "lazy";
      media.decoding = "async";
      if (options.eager) media.fetchPriority = "high";
    }
    media.addEventListener("error", () => {
      figure.hidden = true;
      if (options.onError) options.onError(figure);
    }, { once: true });
    media.src = data.src;
    frame.append(media);
    figure.append(frame);
    if (string(data.caption)) figure.append(element("p", "figure-caption", data.caption));
    return { figure, media, type: data.type };
  }

  function renderPair(containerId, value, isHero = false) {
    const data = object(value);
    const container = $(containerId);
    const onError = () => {
      container.hidden = true;
      container.querySelectorAll("video").forEach((video) => video.pause());
    };
    const source = makeMedia(data.source, { type: "image", label: "Source RGB", alt: "Original RGB image used to reconstruct the scene", eager: isHero, onError });
    const result = makeMedia(data.simulation, { label: "Reconstructed simulation", method: "Support2Sim", alt: "Support2Sim reconstruction of the adjacent source image", onError });
    if (!source || !result) return;
    const pair = element("div", "media-pair");
    pair.append(source.figure, result.figure);
    container.replaceChildren(pair);
    if (string(data.caption)) container.append(element("p", "figure-caption", data.caption));
    container.hidden = false;
    if (isHero && result.type === "video" && data.autoplay === true) {
      const video = result.media;
      if (!motion.matches) {
        video.autoplay = true;
        video.play().catch(() => { /* Native controls remain available. */ });
      }
      motion.addEventListener("change", (event) => {
        if (event.matches) { video.autoplay = false; video.pause(); }
      });
    }
  }

  function renderResults(value) {
    const data = object(value);
    const benchmark = list(data.benchmark).map(object).filter((entry) =>
      [entry.method, entry.iou, entry.supports, entry.driftMm].every((value) => string(value))
    );
    const rows = benchmark.map((entry) => {
      const row = element("tr", entry.primary === true ? "metric-primary" : "");
      const method = element("th", "", entry.method);
      method.scope = "row";
      if (string(entry.detail)) method.append(element("span", "metric-detail", entry.detail));
      const iou = element("td", "", entry.iou);
      if (string(entry.iouNote)) iou.append(element("span", "metric-gain", entry.iouNote));
      row.append(method, iou, element("td", "", entry.supports), element("td", "", entry.driftMm));
      return row;
    });
    if (rows.length) $("results-metric-rows").replaceChildren(...rows);
    $("results-metrics").hidden = Array.isArray(data.benchmark) && data.benchmark.length === 0;
    setText("results-intro", data.intro);
    optionalText("results-note", data.note);
    renderPair("results-media", data);
  }

  // All visible methods share a clock. Playback stops at the shortest clip.
  // Native video controls, the shared scrubber, and shared buttons stay linked.
  class SynchronizedPlayback {
    constructor(videos) {
      this.videos = videos;
      this.playing = false;
      this.disposed = false;
      this.clock = 0;
      this.frame = 0;
      this.lastCorrection = 0;
      this.epoch = 0;
      this.pendingSeeks = new WeakMap();
      this.listeners = [];
      this.playButton = $("rollout-play");
      this.slider = $("rollout-time");
      this.status = $("rollout-status");
      this.listen(this.playButton, "click", () => this.playing ? this.pause() : this.play());
      this.listen($("rollout-reset"), "click", () => { this.pause(false); this.seek(0); this.status.textContent = "All rollouts reset to the start."; });
      this.listen(this.slider, "input", () => this.seek(Number(this.slider.value)));
      videos.forEach((video) => {
        this.listen(video, "loadedmetadata", () => {
          if (this.clock > 0) this.seekVideo(video, this.clock);
          this.update();
        });
        this.listen(video, "durationchange", () => this.update());
        this.listen(video, "play", () => { if (!this.playing) this.play(video); });
        this.listen(video, "pause", () => { if (this.playing && !video.seeking) this.pause(); });
        this.listen(video, "ended", () => this.pause());
        this.listen(video, "seeking", () => {
          const pending = this.pendingSeeks.get(video);
          if (pending !== undefined && Math.abs(pending - video.currentTime) < .08) {
            this.pendingSeeks.delete(video);
            return;
          }
          this.pendingSeeks.delete(video);
          if (Math.abs(video.currentTime - this.clock) > .04) this.seek(video.currentTime);
        });
        this.listen(video, "ratechange", () => {
          this.active().forEach((other) => { if (other.playbackRate !== video.playbackRate) other.playbackRate = video.playbackRate; });
        });
        this.listen(video, "timeupdate", () => {
          if (video === this.active()[0] && !video.seeking) { this.clock = video.currentTime; this.update(); }
        });
        this.listen(video, "error", () => {
          this.pause(false);
          this.status.textContent = this.active().length
            ? "A rollout could not be loaded. The remaining videos are available."
            : "Videos for this scene are unavailable. Choose another scene.";
          this.update();
        });
      });
      this.status.textContent = "";
      this.update();
    }
    listen(target, type, handler) {
      target.addEventListener(type, handler);
      this.listeners.push(() => target.removeEventListener(type, handler));
    }
    active() { return this.videos.filter((video) => !video.error && video.isConnected); }
    duration() {
      const durations = this.active().map((video) => video.duration).filter((duration) => Number.isFinite(duration) && duration > 0);
      return durations.length ? Math.min(...durations) : 0;
    }
    seekVideo(video, time) {
      if (!video.readyState || !Number.isFinite(video.duration)) return;
      const target = Math.min(Math.max(0, time), video.duration);
      if (Math.abs(video.currentTime - target) < .03) return;
      this.pendingSeeks.set(video, target);
      try { video.currentTime = target; } catch { this.pendingSeeks.delete(video); }
    }
    seek(time) {
      const duration = this.duration();
      this.clock = Math.max(0, Math.min(time, duration || time));
      this.active().forEach((video) => this.seekVideo(video, this.clock));
      this.update();
    }
    async play(origin) {
      if (this.disposed || !this.active().length) return;
      if (this.duration() && this.clock >= this.duration() - .05) this.seek(0);
      else if (origin) this.seek(origin.currentTime);
      this.playing = true;
      const epoch = ++this.epoch;
      this.playButton.textContent = "Pause all";
      this.status.textContent = "Playing the visible rollouts together.";
      const results = await Promise.allSettled(this.active().map((video) => video.play()));
      if (this.disposed || epoch !== this.epoch) return;
      if (results.some((result) => result.status === "rejected")) {
        this.pause(false);
        this.status.textContent = "Playback was interrupted. Press Play all to try again.";
        return;
      }
      cancelAnimationFrame(this.frame);
      this.tick();
    }
    pause(announce = true) {
      this.playing = false;
      this.epoch += 1;
      cancelAnimationFrame(this.frame);
      this.videos.forEach((video) => video.pause());
      this.playButton.textContent = "Play all";
      if (announce) this.status.textContent = "All rollouts paused.";
      this.update();
    }
    tick(timestamp = 0) {
      if (!this.playing || this.disposed) return;
      const active = this.active();
      const lead = active[0];
      if (!lead) { this.pause(false); return; }
      if (!lead.seeking) this.clock = lead.currentTime;
      const duration = this.duration();
      if (duration && this.clock >= duration - .035) {
        this.pause(false);
        this.seek(duration);
        this.status.textContent = "End of the shared playback interval.";
        return;
      }
      if (timestamp - this.lastCorrection > 250) {
        active.slice(1).forEach((video) => {
          if (!video.seeking && Math.abs(video.currentTime - this.clock) > .18) this.seekVideo(video, this.clock);
        });
        this.lastCorrection = timestamp;
      }
      this.update();
      this.frame = requestAnimationFrame((time) => this.tick(time));
    }
    update() {
      const duration = this.duration();
      const available = this.active().length > 0;
      this.playButton.disabled = !available;
      $("rollout-reset").disabled = !available;
      this.slider.disabled = !duration;
      this.slider.max = String(duration);
      this.slider.value = String(Math.min(this.clock, duration));
      this.slider.setAttribute("aria-valuetext", `${this.clock.toFixed(1)} seconds${duration ? ` of ${duration.toFixed(1)}` : ""}`);
      $("rollout-clock").textContent = `${this.clock.toFixed(1)}${duration ? ` / ${duration.toFixed(1)}` : ""} s`;
      $("playback-bar").hidden = !available;
    }
    destroy() {
      this.disposed = true;
      this.listeners.forEach((remove) => remove());
      this.pause(false);
    }
  }

  function renderRollouts(value) {
    const data = object(value);
    const scenes = list(data.scenes).map(object).map((scene, index) => ({
      ...scene,
      id: string(scene.id, `scene-${index + 1}`),
      title: string(scene.title, string(scene.id, "Scene")),
      dataset: string(scene.dataset),
      videos: list(scene.videos).map(object).filter((video) => methods.has(video.method) && mediaData(video, "video"))
    })).filter((scene) => mediaData(scene.source, "image") && scene.videos.length);
    if (!scenes.length) return;
    showSection("rollouts", true);
    setText("rollouts-description", data.description);
    optionalText("rollouts-note", data.note);
    const selector = $("rollout-select");
    let current = null;
    let playback = null;
    let filtered = scenes;
    const renderScene = (scene) => {
      if (!scene) return;
      if (playback) playback.destroy();
      current = scene;
      selector.value = scene.id;
      $("rollout-title").textContent = scene.title;
      $("rollout-dataset").textContent = scene.dataset;
      const grid = $("rollout-grid");
      grid.replaceChildren();
      const source = makeMedia(scene.source, { type: "image", label: "Source RGB", alt: `Source RGB image for ${scene.title}` });
      grid.append(source.figure);
      const videos = [];
      scene.videos.forEach((video) => {
        const item = makeMedia(video, {
          type: "video", label: video.method, primary: video.method === "Support2Sim",
          alt: `${video.method} saved simulation rollout for ${scene.title}`,
          onError: () => {
            const visible = [...grid.querySelectorAll("video")].some((node) => !node.error);
            if (!visible) $("rollout-status").textContent = "Videos for this scene are unavailable. Choose another scene.";
          }
        });
        grid.append(item.figure);
        videos.push(item.media);
      });
      grid.dataset.count = String(grid.childElementCount);
      playback = new SynchronizedPlayback(videos);
    };
    const populateScenes = () => {
      selector.replaceChildren();
      filtered.forEach((scene) => {
        const option = element("option", "", scene.title);
        option.value = scene.id;
        selector.append(option);
      });
      selector.disabled = filtered.length < 2;
      renderScene(filtered.find((scene) => current && scene.id === current.id) || filtered[0]);
    };
    const datasets = [...new Set(scenes.map((scene) => scene.dataset).filter(Boolean))];
    const filters = $("dataset-filters");
    filters.replaceChildren();
    if (datasets.length > 1) {
      [null, ...datasets].forEach((dataset) => {
        const button = element("button", "filter-button", dataset || "All datasets");
        button.type = "button";
        button.setAttribute("aria-pressed", String(dataset === null));
        button.addEventListener("click", () => {
          filters.querySelectorAll("button").forEach((node) => node.setAttribute("aria-pressed", String(node === button)));
          filtered = dataset === null ? scenes : scenes.filter((scene) => scene.dataset === dataset);
          populateScenes();
          $("rollout-status").textContent = `${filtered.length} ${filtered.length === 1 ? "scene" : "scenes"} in ${dataset || "all datasets"}.`;
        });
        filters.append(button);
      });
    }
    filters.hidden = datasets.length < 2;
    selector.addEventListener("change", () => renderScene(filtered.find((scene) => scene.id === selector.value)));
    populateScenes();
    document.addEventListener("visibilitychange", () => { if (document.hidden && playback) playback.pause(false); });
  }

  let viewerLibrary;
  function loadViewerLibrary() {
    if (customElements.get("model-viewer")) return Promise.resolve();
    if (viewerLibrary) return viewerLibrary;
    viewerLibrary = new Promise((resolve, reject) => {
      const script = element("script");
      script.type = "module";
      script.src = "vendor/model-viewer.min.js";
      const timeout = setTimeout(() => fail(), 25000);
      const fail = () => {
        clearTimeout(timeout);
        script.remove();
        viewerLibrary = null;
        reject(new Error("The local 3D viewer could not be loaded."));
      };
      script.addEventListener("load", () => {
        clearTimeout(timeout);
        if (customElements.get("model-viewer")) resolve(); else fail();
      }, { once: true });
      script.addEventListener("error", fail, { once: true });
      document.head.append(script);
    });
    return viewerLibrary;
  }

  function renderViewer(value) {
    const data = object(value);
    const models = list(data.models).map(object).filter((model) => localPath(model.src) && localPath(model.poster));
    if (!models.length) return;
    showSection("scenes", true);
    setText("viewer-description", data.description);
    const selector = $("model-select");
    const poster = $("model-poster");
    const loadButton = $("model-load");
    const overlay = $("model-load-overlay");
    const stage = $("model-stage");
    const status = $("model-status");
    let selected;
    let viewer = null;
    let generation = 0;
    let modelTimeout;
    selector.replaceChildren();
    models.forEach((model, index) => {
      const option = element("option", "", string(model.label, string(model.id, `Scene ${index + 1}`)));
      option.value = String(index);
      selector.append(option);
    });
    selector.disabled = models.length < 2;
    function selectModel(index) {
      generation += 1;
      clearTimeout(modelTimeout);
      if (viewer) viewer.remove();
      viewer = null;
      selected = models[index];
      poster.hidden = false;
      poster.alt = string(selected.alt, `Textured reconstruction of ${string(selected.label, "the selected scene")}`);
      poster.src = localPath(selected.poster);
      overlay.hidden = false;
      loadButton.disabled = false;
      loadButton.textContent = "Load interactive scene";
      $("model-controls").hidden = true;
      stage.removeAttribute("aria-busy");
      status.textContent = "";
      $("model-dataset").textContent = string(selected.dataset);
      optionalText("model-caption", selected.caption);
      const sourceContainer = $("model-source");
      sourceContainer.replaceChildren();
      const source = makeMedia(selected.source, {
        type: "image", label: "Source RGB", alt: `Source RGB image for ${string(selected.label, "the selected reconstruction")}`,
        onError: () => { sourceContainer.hidden = true; $("viewer-grid").classList.add("no-source"); }
      });
      sourceContainer.hidden = !source;
      $("viewer-grid").classList.toggle("no-source", !source);
      if (source) sourceContainer.append(source.figure);
    }
    poster.addEventListener("error", () => { poster.hidden = true; status.textContent = "The preview image is unavailable. You can still load the interactive scene."; });
    selector.addEventListener("change", () => selectModel(Number(selector.value)));
    loadButton.addEventListener("click", async () => {
      const request = ++generation;
      loadButton.disabled = true;
      loadButton.textContent = "Loading scene…";
      stage.setAttribute("aria-busy", "true");
      status.textContent = "Loading the interactive scene. The preview remains available.";
      const fail = () => {
        if (request !== generation) return;
        clearTimeout(modelTimeout);
        if (viewer) viewer.remove();
        viewer = null;
        stage.removeAttribute("aria-busy");
        overlay.hidden = false;
        poster.hidden = false;
        loadButton.disabled = false;
        loadButton.textContent = "Retry interactive scene";
        $("model-controls").hidden = true;
        status.textContent = "The interactive scene could not be loaded. The preview is still available.";
      };
      try {
        await loadViewerLibrary();
        if (request !== generation) return;
        viewer = element("model-viewer");
        viewer.setAttribute("camera-controls", "");
        viewer.setAttribute("touch-action", "pan-y");
        viewer.setAttribute("shadow-intensity", "0.6");
        viewer.setAttribute("exposure", "1");
        viewer.setAttribute("environment-image", "neutral");
        viewer.setAttribute("interaction-prompt", "none");
        viewer.setAttribute("loading", "eager");
        viewer.setAttribute("alt", string(selected.alt, "Interactive textured Support2Sim scene"));
        viewer.setAttribute("aria-label", string(selected.alt, "Interactive textured Support2Sim scene"));
        viewer.setAttribute("tabindex", "0");
        viewer.setAttribute("camera-orbit", string(selected.cameraOrbit, "auto auto auto"));
        viewer.setAttribute("camera-target", string(selected.cameraTarget, "auto auto auto"));
        viewer.setAttribute("field-of-view", string(selected.fieldOfView, "auto"));
        if (motion.matches) viewer.setAttribute("interpolation-decay", "0");
        viewer.addEventListener("error", fail, { once: true });
        viewer.addEventListener("load", () => {
          if (request !== generation || !viewer) return;
          clearTimeout(modelTimeout);
          viewer.classList.add("is-loaded");
          poster.hidden = true;
          overlay.hidden = true;
          stage.removeAttribute("aria-busy");
          $("model-controls").hidden = false;
          status.textContent = "Scene loaded. Use the pointer, arrow keys, or camera buttons to explore.";
          viewer.focus({ preventScroll: true });
        }, { once: true });
        // This is the first assignment of the mesh URL; no model is prefetched.
        viewer.setAttribute("src", localPath(selected.src));
        stage.append(viewer);
        modelTimeout = setTimeout(fail, 45000);
      } catch { fail(); }
    });
    document.querySelectorAll("[data-camera]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!viewer || !viewer.classList.contains("is-loaded")) return;
        const action = button.dataset.camera;
        if (action === "reset") {
          viewer.cameraOrbit = string(selected.cameraOrbit, "auto auto auto");
          viewer.cameraTarget = string(selected.cameraTarget, "auto auto auto");
          viewer.fieldOfView = string(selected.fieldOfView, "auto");
          if (motion.matches) viewer.jumpCameraToGoal();
          return;
        }
        const orbit = viewer.getCameraOrbit();
        const angle = action === "left" ? -.26 : action === "right" ? .26 : 0;
        const zoom = action === "in" ? .85 : action === "out" ? 1.18 : 1;
        viewer.cameraOrbit = `${orbit.theta + angle}rad ${orbit.phi}rad ${orbit.radius * zoom}m`;
        if (motion.matches) viewer.jumpCameraToGoal();
      });
    });
    motion.addEventListener("change", () => {
      if (viewer) viewer.setAttribute("interpolation-decay", motion.matches ? "0" : "50");
    });
    selectModel(0);
  }

  function renderPolicy(value) {
    const data = object(value);
    const tasks = list(data.tasks).map(object).filter((task) => mediaData(task.video, "video") || mediaData(task.image, "image"));
    if (!tasks.length) return;
    const grid = $("policy-grid");
    grid.replaceChildren();
    showSection("policy", true);
    setText("policy-summary", data.summary);
    optionalText("policy-note", data.note);
    const success = string(data.meanSuccess);
    if (success) {
      $("policy-stat").replaceChildren(document.createTextNode(success), element("span", "", string(data.metricLabel, "mean success")));
      $("policy-stat").hidden = false;
    }
    tasks.forEach((task) => {
      const holder = element("div", "policy-task");
      const title = string(task.title, "Policy learning task");
      const fallback = () => {
        holder.replaceChildren();
        const image = makeMedia(task.image, { type: "image", label: title, method: "Task image", alt: `Task image for ${title}`, onError: () => {
          holder.hidden = true;
          if (![...grid.children].some((child) => !child.hidden)) showSection("policy", false);
        } });
        if (image) holder.append(image.figure); else holder.hidden = true;
        if (string(task.caption) && image) holder.append(element("p", "figure-caption", task.caption));
        if (![...grid.children].some((child) => !child.hidden)) showSection("policy", false);
      };
      grid.append(holder);
      const video = makeMedia(task.video, { type: "video", label: title, preload: "none", alt: `Saved policy rollout for ${title}`, onError: fallback });
      if (video) {
        holder.append(video.figure);
        if (string(task.caption)) holder.append(element("p", "figure-caption", task.caption));
      } else fallback();
    });
    showSection("policy", [...grid.children].some((child) => !child.hidden));
  }

  function renderMultiview(value) {
    const data = object(value);
    const grid = $("multiview-grid");
    const clips = list(data.scenes).map(object).map((scene) => makeMedia(scene.video, {
      type: "video",
      label: string(scene.title, "Multiview reconstruction"),
      preload: "none",
      onError: () => showSection("multiview", [...grid.children].some((figure) => !figure.hidden))
    })).filter(Boolean);
    grid.replaceChildren(...clips.map(({ figure }) => figure));
    showSection("multiview", clips.length > 0);
    optionalText("multiview-description", data.description);
  }

  function renderMethod(value) {
    const data = object(value);
    const image = makeMedia(data.image, { type: "image", alt: "Support2Sim method overview: from a source image to a reconstructed scene with stable object supports", onError: () => showSection("method", false) });
    if (!image) return;
    showSection("method", true);
    $("method-image").className = "method-image";
    $("method-image").replaceChildren(image.figure);
    optionalText("method-description", data.description);
    const steps = $("method-steps");
    list(data.steps).map(object).forEach((step) => {
      if (!string(step.title) || !string(step.description)) return;
      const item = element("div");
      item.append(element("h3", "", step.title), element("p", "", step.description));
      steps.append(item);
    });
    steps.hidden = !steps.childElementCount;
  }

  function initProjectVideo() {
    const video = $("project-video-player");
    const launch = $("project-video-launch");
    const fallback = $("project-video-fallback");
    const dismissLaunch = () => {
      const hadFocus = document.activeElement === launch;
      video.controls = true;
      launch.hidden = true;
      if (hadFocus) video.focus({ preventScroll: true });
    };
    const revealFallback = () => {
      dismissLaunch();
      fallback.hidden = false;
    };

    video.controls = false;
    launch.hidden = false;
    launch.addEventListener("click", () => video.play().catch(revealFallback));
    video.addEventListener("playing", dismissLaunch, { once: true });
    video.addEventListener("error", revealFallback, { once: true });
    video.querySelector("source").addEventListener("error", revealFallback, { once: true });
  }

  async function init() {
    initProjectVideo();
    let data;
    try {
      const response = await fetch("data/site-content.json", { credentials: "same-origin", cache: "no-cache" });
      if (!response.ok) throw new Error("Content manifest unavailable");
      data = object(await response.json());
      if (data.schemaVersion !== undefined && data.schemaVersion !== 1) throw new Error("Unsupported content schema");
    } catch {
      // The static title, summary, and supplied results remain useful on their own.
      console.info("Support2Sim: local media manifest unavailable; displaying the static overview.");
      return;
    }
    setText("hero-subtitle", data.subtitle);
    setText("system-summary", data.summary);
    const sections = [
      () => renderPair("hero-media", data.hero, true),
      () => renderResults(data.results),
      () => renderRollouts(data.rollouts),
      () => renderViewer(data.viewer),
      () => renderPolicy(data.policy),
      () => renderMultiview(data.multiview),
      () => renderMethod(data.method)
    ];
    // A malformed optional section must not prevent other media from rendering.
    sections.forEach((render) => {
      try { render(); } catch { console.warn("Support2Sim: an optional section could not be rendered."); }
    });
  }

  init();
})();

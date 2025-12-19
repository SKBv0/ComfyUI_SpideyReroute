import { app } from "../../scripts/app.js";

const NODE_TYPE = "SpideyReroute";
const DEFAULT_SIZE = [260, 120];
const IMAGE_MAX_WIDTH = 260;
const IMAGE_MAX_HEIGHT = 120;
const SPIDEY_SRC = `${new URL("./Spidey.png", import.meta.url).href}?v=2`;
const ICON_SIZE = 18;
const DIALOG_WIDTH = 180;
const DIALOG_HEIGHT = 118;
const BTN_HEIGHT = 22;
const SCALE_MIN = 0.2;
const SCALE_MAX = 2.5;
const IMAGE_BASE_OFFSET_Y = 12;
const DEBUG = false;

const spideyImage = new Image();
let spideyReady = false;
spideyImage.onload = () => {
    spideyReady = true;
    app?.graph?.setDirtyCanvas(true, true);
};
spideyImage.onerror = (err) => {
    if (DEBUG) {
        console.error("[SpideyReroute] failed to load Spidey.png", err);
    }
};
spideyImage.src = SPIDEY_SRC;

app.registerExtension({
    name: "SpideyReroute",
    beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_TYPE) return;

        nodeData.title = "";
        nodeType.title = "";
        if (typeof LiteGraph !== "undefined" && LiteGraph.NO_TITLE !== undefined) {
            nodeType.title_mode = LiteGraph.NO_TITLE;
        }

        const onNodeCreated = nodeType.prototype.onNodeCreated;

        nodeType.prototype.onNodeCreated = function (...args) {
            onNodeCreated?.apply(this, args);

            this.properties = this.properties || {};
            this.properties.offsetY = this.properties.offsetY ?? 0;
            this.properties.scale = this.properties.scale ?? 1;
            this.properties.rotate = this.properties.rotate ?? 0;

            this.bgcolor = "transparent";
            this.color = "transparent";
            this.boxcolor = "transparent";
            this.title = "";
            this.flags = this.flags || {};
            this.flags.no_title = true;

            this.flags.skip_background = true;

            this.show_slot_names = false;

            this._hovering = false;
            this._panelOpen = false;
            this._editIconBounds = null;

            this._panelEl = null;
            this._sliderOffset = null;
            this._sliderScale = null;
            this._sliderRotate = null;
            this._sliderOffsetLabel = null;
            this._sliderScaleLabel = null;
            this._sliderRotateLabel = null;
            this._panelAnchorOffset = null;

            this._customImage = null;
            this._customImageReady = false;
            this._customImageUrl = null;
            this._fileInput = null;

            this.size = this.computeSize();

            this._clearSlotLabels();
        };

        nodeType.prototype._clearSlotLabels = function () {
            if (this.inputs?.[0]) {
                this.inputs[0].label = " ";
                this.inputs[0].name = " ";
            }
            if (this.outputs?.[0]) {
                this.outputs[0].label = " ";
                this.outputs[0].name = " ";
            }
        };

        nodeType.prototype.onConfigure = function () {
            this._clearSlotLabels();
            this.title = "";
        };

        nodeType.prototype.getInputSlotLabel = () => " ";
        nodeType.prototype.getOutputSlotLabel = () => " ";

        nodeType.prototype.computeSize = function (size) {
            const activeImg = this._customImageReady ? this._customImage : spideyImage;
            const activeReady = this._customImageReady || spideyReady;
            if (activeReady && activeImg?.naturalWidth > 0) {
                const scale = Math.min(
                    IMAGE_MAX_WIDTH / activeImg.naturalWidth,
                    IMAGE_MAX_HEIGHT / activeImg.naturalHeight,
                    1
                );
                const userScale = this.properties.scale ?? 1;
                const w = Math.max(80, activeImg.naturalWidth * scale * userScale + 12);
                const h = Math.max(48, activeImg.naturalHeight * scale * userScale + 12 + 20);
                return [w, h];
            }
            return size ?? DEFAULT_SIZE;
        };

        nodeType.prototype.onDrawForeground = function (ctx) {
            if (this.flags.collapsed) return;

            const [width, height] = this.size;

            const pad = 8;
            const w = width - pad * 2;
            const h = height - pad * 2;
            const x = pad;

            const imgEl = this._customImageReady ? this._customImage : spideyImage;
            const offsetY = this.properties.offsetY ?? 0;
            const userScale = this.properties.scale ?? 1;
            const hasImage = (this._customImageReady || spideyReady) && imgEl?.naturalWidth > 0;
            if (hasImage) {
                ctx.save();
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";

                const imgRatio = imgEl.naturalWidth / imgEl.naturalHeight;
                let imgWidth = Math.min(imgEl.naturalWidth, w, IMAGE_MAX_WIDTH);
                let imgHeight = imgWidth / imgRatio;
                if (imgHeight > h) {
                    imgHeight = Math.min(imgHeight, h, IMAGE_MAX_HEIGHT);
                    imgWidth = imgHeight * imgRatio;
                }
                imgWidth *= userScale;
                imgHeight *= userScale;

                const imgX = x + (w - imgWidth) / 2;
                const socketY = (typeof LiteGraph !== "undefined" ? LiteGraph.NODE_SLOT_HEIGHT * 0.5 : 10);
                const imgY = socketY - imgHeight * 0.4 + IMAGE_BASE_OFFSET_Y + offsetY;

                const cx = imgX + imgWidth / 2;
                const cy = imgY + imgHeight / 2;
                const radians = ((this.properties.rotate ?? 0) * Math.PI) / 180;
                ctx.translate(cx, cy);
                ctx.rotate(radians);
                ctx.drawImage(imgEl, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
                ctx.rotate(-radians);
                ctx.translate(-cx, -cy);

                ctx.restore();
            }

            if (this._hovering && !this._panelOpen) {
                const iconMargin = 10;
                const iconX = width - ICON_SIZE - iconMargin;
                const iconY = Math.max(iconMargin, height - ICON_SIZE - iconMargin);
                this._editIconBounds = [iconX, iconY, ICON_SIZE, ICON_SIZE];
                const overIcon = this._isInsideBounds(this._lastLocalX, this._lastLocalY, this._editIconBounds);
                const iconAlpha = overIcon ? 0.9 : 0.65;
                ctx.save();
                ctx.globalAlpha = iconAlpha;
                ctx.fillStyle = "#0f0f0f";
                ctx.strokeStyle = "#dcdcdc";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(iconX, iconY, ICON_SIZE, ICON_SIZE, 4);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = "#f5f5f5";
                ctx.beginPath();
                ctx.moveTo(iconX + 5, iconY + 12);
                ctx.lineTo(iconX + 12, iconY + 5);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(iconX + 6, iconY + 13);
                ctx.lineTo(iconX + 11, iconY + 8);
                ctx.stroke();
                ctx.restore();
            } else {
                this._editIconBounds = null;
            }

            this._updateDomPanel();
        };

        nodeType.prototype._ensureFileInput = function () {
            if (this._fileInput) return;
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/png,image/*";
            input.style.display = "none";
            input.addEventListener("change", (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = URL.createObjectURL(file);
                const img = new Image();
                img.onload = () => {
                    if (this._customImageUrl) URL.revokeObjectURL(this._customImageUrl);
                    this._customImageUrl = url;
                    this._customImage = img;
                    this._customImageReady = true;
                    this.size = this.computeSize();
                    this.setDirtyCanvas(true, true);
                };
                img.onerror = (err) => {
                    if (DEBUG) {
                        console.warn("[SpideyReroute] custom image load failed", err);
                    }
                    URL.revokeObjectURL(url);
                };
                img.src = url;
                input.value = "";
            });
            document.body?.appendChild(input);
            this._fileInput = input;
        };

        nodeType.prototype._isInsideBounds = function (lx, ly, bounds) {
            if (!bounds) return false;
            const [x, y, w, h] = bounds;
            return lx >= x && lx <= x + w && ly >= y && ly <= y + h;
        };

        nodeType.prototype.onMouseMove = function (e) {
            const lx = e.canvasX - this.pos[0];
            const ly = e.canvasY - this.pos[1];
            this._lastLocalX = lx;
            this._lastLocalY = ly;
            const inside = lx >= 0 && ly >= 0 && lx <= this.size[0] && ly <= this.size[1];
            const prevHover = this._hovering;
            this._hovering = inside;
            if (prevHover !== this._hovering) {
                this.setDirtyCanvas(true);
            }
            return false;
        };

        nodeType.prototype.onMouseLeave = function () {
            if (!this._hovering) return;
            this._hovering = false;
            this._editIconBounds = null;
            this.setDirtyCanvas(true);
        };

        nodeType.prototype.onMouseDown = function (e) {
            const lx = e.canvasX - this.pos[0];
            const ly = e.canvasY - this.pos[1];
            this._lastLocalX = lx;
            this._lastLocalY = ly;

            if (this._isInsideBounds(lx, ly, this._editIconBounds)) {
                this._panelOpen = !this._panelOpen;
                if (this._panelOpen) {
                    this._ensureDomPanel();
                    this._panelAnchorOffset = this.size ? [...this.size] : DEFAULT_SIZE;
                }
                this._updateDomPanel(true);
                this.setDirtyCanvas(true);
                return true;
            }

            return false;
        };

        nodeType.prototype._ensureDomPanel = function () {
            if (this._panelEl) return;

            const panel = document.createElement("div");
            panel.className = "spidey-panel";
            panel.style.position = "absolute";
            panel.style.zIndex = 9999;
            panel.style.width = `${DIALOG_WIDTH}px`;
            panel.style.minHeight = `${DIALOG_HEIGHT}px`;
            panel.style.padding = "10px";
            panel.style.boxSizing = "border-box";
            panel.style.background = "rgba(18,18,18,0.95)";
            panel.style.border = "1px solid rgba(255,255,255,0.18)";
            panel.style.borderRadius = "8px";
            panel.style.boxShadow = "0 4px 18px rgba(0,0,0,0.35)";
            panel.style.color = "#e6e6e6";
            panel.style.font = "12px sans-serif";
            panel.style.display = "none";
            panel.style.pointerEvents = "auto";

            const stop = (ev) => ev.stopPropagation();
            panel.addEventListener("pointerdown", stop);
            panel.addEventListener("pointerup", stop);

            const header = document.createElement("div");
            header.style.display = "flex";
            header.style.alignItems = "center";
            header.style.justifyContent = "space-between";
            header.style.marginBottom = "8px";
            const title = document.createElement("span");
            title.textContent = "Edit";
            const closeBtn = document.createElement("button");
            closeBtn.textContent = "×";
            closeBtn.style.background = "transparent";
            closeBtn.style.color = "#e6e6e6";
            closeBtn.style.border = "none";
            closeBtn.style.cursor = "pointer";
            closeBtn.style.fontSize = "14px";
            closeBtn.style.padding = "2px 6px";
            closeBtn.addEventListener("click", (ev) => {
                ev.stopPropagation();
                this._panelOpen = false;
                this._updateDomPanel(true);
                this.setDirtyCanvas(true);
            });
            header.appendChild(title);
            header.appendChild(closeBtn);
            panel.appendChild(header);

            const createBtn = (label, onClick) => {
                const btn = document.createElement("button");
                btn.textContent = label;
                btn.style.width = "100%";
                btn.style.height = `${BTN_HEIGHT}px`;
                btn.style.marginBottom = "8px";
                btn.style.background = "#2b2b2b";
                btn.style.color = "#f5f5f5";
                btn.style.border = "1px solid rgba(255,255,255,0.15)";
                btn.style.borderRadius = "4px";
                btn.style.cursor = "pointer";
                btn.addEventListener("click", (ev) => {
                    ev.stopPropagation();
                    onClick();
                });
                return btn;
            };

            const pickBtn = createBtn("Pick PNG", () => {
                this._ensureFileInput();
                this._fileInput?.click();
            });
            panel.appendChild(pickBtn);

            const makeSlider = (label, min, max, step, initial, onChange) => {
                const wrap = document.createElement("div");
                wrap.style.display = "flex";
                wrap.style.flexDirection = "column";
                wrap.style.gap = "4px";
                wrap.style.marginBottom = "10px";
                const row = document.createElement("div");
                row.style.display = "flex";
                row.style.justifyContent = "space-between";
                row.style.alignItems = "center";
                const lbl = document.createElement("span");
                lbl.textContent = label;
                const val = document.createElement("span");
                val.textContent = String(initial);
                row.appendChild(lbl);
                row.appendChild(val);
                const slider = document.createElement("input");
                slider.type = "range";
                slider.min = String(min);
                slider.max = String(max);
                slider.step = String(step);
                slider.value = String(initial);
                slider.addEventListener("input", (ev) => {
                    const v = Number(ev.target.value);
                    val.textContent = String(v);
                    onChange(v);
                });
                wrap.appendChild(row);
                wrap.appendChild(slider);
                return { wrap, slider, val };
            };

            const offsetInit = this.properties.offsetY ?? 0;
            const offsetSlider = makeSlider("Position Y", -300, 300, 1, offsetInit, (v) => {
                this.properties.offsetY = v;
                this.setDirtyCanvas(true, true);
            });
            panel.appendChild(offsetSlider.wrap);
            this._sliderOffset = offsetSlider.slider;
            this._sliderOffsetLabel = offsetSlider.val;

            const scaleInit = this.properties.scale ?? 1;
            const scaleSlider = makeSlider("Scale", SCALE_MIN, SCALE_MAX, 0.01, scaleInit, (v) => {
                const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, v));
                this.properties.scale = Number(clamped.toFixed(2));
                this.size = this.computeSize();
                this.setDirtyCanvas(true, true);
                this._updateDomPanel(true);
            });
            panel.appendChild(scaleSlider.wrap);
            this._sliderScale = scaleSlider.slider;
            this._sliderScaleLabel = scaleSlider.val;

            const rotateInit = this.properties.rotate ?? 0;
            const rotateSlider = makeSlider("Rotate (deg)", -180, 180, 1, rotateInit, (v) => {
                this.properties.rotate = v;
                this.setDirtyCanvas(true, true);
            });
            panel.appendChild(rotateSlider.wrap);
            this._sliderRotate = rotateSlider.slider;
            this._sliderRotateLabel = rotateSlider.val;

            document.body?.appendChild(panel);
            this._panelEl = panel;
        };

        nodeType.prototype._updateDomPanel = function (forceShow) {
            if (!this._panelEl && !forceShow) return;
            this._ensureDomPanel();
            const panel = this._panelEl;
            if (!this._panelOpen) {
                panel.style.display = "none";
                return;
            }
            panel.style.display = "block";
            const syncSlider = (sliderEl, labelEl, value) => {
                if (sliderEl) sliderEl.value = String(value);
                if (labelEl) labelEl.textContent = String(value);
            };
            syncSlider(this._sliderOffset, this._sliderOffsetLabel, this.properties.offsetY ?? 0);
            syncSlider(this._sliderScale, this._sliderScaleLabel, this.properties.scale ?? 1);
            syncSlider(this._sliderRotate, this._sliderRotateLabel, this.properties.rotate ?? 0);

            const canvas = globalThis?.LiteGraph?.LGraphCanvas?.active_canvas || app?.graphcanvas || app?.canvas;
            if (!canvas || typeof canvas.convertOffsetToCanvas !== "function") return;
            const [dx, dy] = this._panelAnchorOffset ?? DEFAULT_SIZE;
            const [anchorX, anchorY] = canvas.convertOffsetToCanvas([this.pos[0] + dx, this.pos[1] + dy]);
            const left = anchorX - (DIALOG_WIDTH - ICON_SIZE);
            const top = anchorY - DIALOG_HEIGHT - 12;
            panel.style.left = `${Math.round(Math.max(8, left))}px`;
            panel.style.top = `${Math.round(Math.max(8, top))}px`;
        };

        const onRemoved = nodeType.prototype.onRemoved;
        nodeType.prototype.onRemoved = function () {
            if (this._customImageUrl) {
                URL.revokeObjectURL(this._customImageUrl);
                this._customImageUrl = null;
            }
            if (this._panelEl?.parentNode) {
                this._panelEl.parentNode.removeChild(this._panelEl);
            }
            if (this._fileInput?.parentNode) {
                this._fileInput.parentNode.removeChild(this._fileInput);
            }
            onRemoved?.apply(this, arguments);
        };
    },
});

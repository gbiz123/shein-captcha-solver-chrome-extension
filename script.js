"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
(function () {
    // Avoid multiple instances running:
    if (window.hasRun === true)
        return true;
    window.hasRun = true;
    const CONTAINER = document.documentElement || document.body;
    // Api key is passed from extension via message
    chrome.runtime.onMessage.addListener(function (request, _, sendResponse) {
        if (request.apiKey !== null) {
            console.log("Api key: " + request.apiKey);
            localStorage.setItem("sadCaptchaKey", request.apiKey);
            sendResponse({ message: "API key set.", success: 1 });
        }
        else {
            sendResponse({ message: "API key cannot be empty.", success: 0 });
        }
    });
    function getApiKey() {
        let apiKey = localStorage.getItem("sadCaptchaKey");
        if (apiKey) {
            return apiKey;
        }
        else {
            throw new Error("could not get sadCaptchaKey from localStorage");
        }
    }
    let creditsUrl = "https://www.sadcaptcha.com/api/v1/license/credits?licenseKey=";
    let iconUrl = "https://www.sadcaptcha.com/api/v1/shein-icon?licenseKey=";
    let nineUrl = "https://www.sadcaptcha.com/api/v1/shein-nine?licenseKey=";
    const API_HEADERS = new Headers({ "Content-Type": "application/json" });
    // nine captcha appears in shadow root which 
    // main icon: document.querySelector("#nine-captcha-custom").shadowRoot.querySelector(".nine-header-content-img > img")
    // icons: document.querySelector("#nine-captcha-custom").shadowRoot.querySelectorAll(".nine-content-pic > img")
    // header: document.querySelector("#nine-captcha-custom").shadowRoot.querySelectorAll(".nine-header-content-title")
    const NINE_CAPTCHA_CONTAINER = "#nine-captcha-custom";
    const NINE_CAPTCHA_MAIN_ICON = ".nine-header-content-img > img";
    const NINE_CAPTCHA_HEADER_TEXT = ".nine-header-content-title";
    const NINE_CAPTCHA_ICONS = ".nine-content-pic > img";
    const NINE_CAPTCHA_UNIQUE_IDENTIFIERS = [NINE_CAPTCHA_CONTAINER];
    const ONE_PASS_CONTAINER = "#one-pass-custom";
    const ONE_PASS_CHECKBOX = ".risk-one-pass-content-checkbox";
    const ICON_IMAGE_DIV = ".pic_wrapper";
    const ICON_SUBMIT_BUTTON = ".captcha_click_confirm";
    const ICON_REFRESH_BUTTON = ".captcha_click_refresh";
    const ICON_UNIQUE_IDENTIFIERS = [ICON_IMAGE_DIV];
    const CAPTCHA_PRESENCE_INDICATORS = [
        ICON_IMAGE_DIV,
        ICON_SUBMIT_BUTTON,
        ICON_REFRESH_BUTTON,
        NINE_CAPTCHA_CONTAINER
    ];
    let CaptchaType;
    (function (CaptchaType) {
        CaptchaType[CaptchaType["ICON"] = 0] = "ICON";
        CaptchaType[CaptchaType["NINE"] = 1] = "NINE";
    })(CaptchaType || (CaptchaType = {}));
    // Split each mouseMoved into a batch of interpolated points on the device pixel lattice
    const INTERPOLATE_MOVES = false;
    function findFirstElementToAppear(selectors) {
        return new Promise(resolve => {
            const observer = new MutationObserver(mutations => {
                for (const mutation of mutations) {
                    if (mutation.addedNodes === null)
                        continue;
                    let addedNode = [];
                    mutation.addedNodes.forEach(node => addedNode.push(node));
                    for (const node of addedNode)
                        for (const selector of selectors) {
                            if (node instanceof Element) {
                                let element = document.querySelector(selector);
                                if (element) {
                                    console.debug(`element matched ${selector}`);
                                    observer.disconnect();
                                    console.dir(element);
                                    return resolve(element);
                                }
                            }
                            else {
                                console.log("added node was not instanceof element");
                            }
                        }
                }
            });
            observer.observe(CONTAINER, {
                childList: true,
                subtree: true
            });
        });
    }
    function waitForElement(selector, iframeSelector) {
        return new Promise(resolve => {
            let targetDocument;
            if (iframeSelector !== undefined) {
                let iframe = document.querySelector(iframeSelector);
                targetDocument = iframe.contentWindow.document;
            }
            else {
                targetDocument = window.document;
            }
            if (targetDocument.querySelector(selector)) {
                console.log("Selector found: " + selector);
                return resolve(targetDocument.querySelector(selector));
            }
            else {
                const observer = new MutationObserver(_ => {
                    if (targetDocument.querySelector(selector)) {
                        observer.disconnect();
                        console.log("Selector found by mutation observer: " + selector);
                        return resolve(targetDocument.querySelector(selector));
                    }
                });
                observer.observe(CONTAINER, {
                    childList: true,
                    subtree: true
                });
            }
        });
    }
    function creditsApiCall() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("making api call");
            let resp = yield fetch(creditsUrl + getApiKey(), {
                method: "GET",
                headers: API_HEADERS,
            });
            let credits = (yield resp.json()).credits;
            console.log("api credits = " + credits);
            return credits;
        });
    }
    function apiCall(url, body) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("making api call");
            let resp = yield fetch(url + getApiKey(), {
                method: "POST",
                headers: API_HEADERS,
                body: JSON.stringify(body)
            });
            console.log("got api response:");
            console.log(resp);
            return resp;
        });
    }
    function nineApiCall(request) {
        return __awaiter(this, void 0, void 0, function* () {
            let resp = yield apiCall(nineUrl, request);
            let j = yield resp.json();
            console.log("nine captcha response: " + JSON.stringify(j));
            return j;
        });
    }
    function iconApiCall(imageB64) {
        return __awaiter(this, void 0, void 0, function* () {
            let resp = yield apiCall(iconUrl, {
                imageB64: imageB64
            });
            let j = yield resp.json();
            console.log("icon response: " + JSON.stringify(j));
            return j;
        });
    }
    function anySelectorInListPresent(selectors) {
        for (const selector of selectors) {
            let ele = document.querySelector(selector);
            if (ele) {
                console.log(`selector ${selector} is present`);
                return true;
            }
            let iframe = document.querySelector("iframe");
            if (iframe) {
                console.log("checking for selector in iframe");
                ele = iframe.contentWindow.document.body.querySelector(selector);
                if (ele) {
                    console.log("Selector is present in iframe: " + selector);
                    return true;
                }
            }
        }
        console.log(`no selector in list is present`);
        return false;
    }
    function identifyCaptcha() {
        return __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < 30; i++) {
                if (anySelectorInListPresent(ICON_UNIQUE_IDENTIFIERS)) {
                    console.log("icon detected");
                    return CaptchaType.ICON;
                }
                else if (anySelectorInListPresent(NINE_CAPTCHA_UNIQUE_IDENTIFIERS)) {
                    console.log("nine captcha detected");
                    return CaptchaType.NINE;
                }
                else {
                    yield new Promise(r => setTimeout(r, 1000));
                }
            }
            throw new Error("Could not identify CaptchaType");
        });
    }
    function getBase64StringFromDataURL(dataUrl) {
        let img = dataUrl.replace('data:', '').replace(/^.+,/, '');
        console.log("got b64 string from data URL");
        return img;
    }
    function fetchImageAsBase64(url) {
        return __awaiter(this, void 0, void 0, function* () {
            let resp = yield fetch(url);
            let blob = yield resp.blob();
            return new Promise((resolve, reject) => {
                let reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        });
    }
    let trustedInputAvailable = null;
    let mouseIsDown = false;
    // Trusted input is produced by the extension's background service worker,
    // which attaches chrome.debugger to this tab and forwards these messages to
    // CDP Input.dispatchMouseEvent. Events dispatched that way have isTrusted = true.
    function sendInputMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let resp = yield chrome.runtime.sendMessage(message);
                return resp !== undefined && resp !== null && resp.ok === true;
            }
            catch (err) {
                console.log("error sending input message to background");
                console.error(err);
                return false;
            }
        });
    }
    function toDeviceLattice(v) {
        const dpr = window.devicePixelRatio || 1;
        return Math.round(v * dpr) / dpr;
    }
    let cursor = { x: null, y: null };
    function acquireTrustedInput() {
        return __awaiter(this, void 0, void 0, function* () {
            trustedInputAvailable = yield sendInputMessage({ sadCaptchaInput: "acquire" });
            console.log("trusted input available: " + trustedInputAvailable);
            return trustedInputAvailable;
        });
    }
    function releaseTrustedInput() {
        return __awaiter(this, void 0, void 0, function* () {
            if (trustedInputAvailable === true)
                yield sendInputMessage({ sadCaptchaInput: "release" });
            trustedInputAvailable = null;
            mouseIsDown = false;
        });
    }
    function dispatchTrustedMouse(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const prevX = cursor.x;
            const prevY = cursor.y;
            if (typeof params.x === "number" && typeof params.y === "number") {
                cursor.x = params.x;
                cursor.y = params.y;
            }
            if (trustedInputAvailable === false)
                return false;
            if (trustedInputAvailable === null)
                yield acquireTrustedInput();
            if (trustedInputAvailable !== true)
                return false;
            let msg;
            let paceMs = 0;
            if (INTERPOLATE_MOVES && params.type === "mouseMoved"
                && prevX !== null && prevY !== null
                && typeof params.x === "number") {
                const dist = Math.sqrt(Math.pow(params.x - prevX, 2)
                    + Math.pow(params.y - prevY, 2));
                const pts = Math.max(2, Math.min(12, Math.round(dist / 4)));
                let batch = [];
                for (let i = 1; i <= pts; i++) {
                    const f = i / pts;
                    batch.push(Object.assign({}, params, {
                        x: toDeviceLattice(prevX + (params.x - prevX) * f),
                        y: toDeviceLattice(prevY + (params.y - prevY) * f)
                    }));
                }
                paceMs = pts * 2 + 4;
                msg = { sadCaptchaInput: "mouseBatch", batch: batch };
            }
            else {
                msg = { sadCaptchaInput: "mouse", params: params };
            }
            const t0 = performance.now();
            let ok = yield sendInputMessage(msg);
            if (!ok) {
                // debugger may have been detached, try to re-attach once
                trustedInputAvailable = null;
                yield acquireTrustedInput();
                if (trustedInputAvailable === true)
                    ok = yield sendInputMessage(msg);
            }
            const spent = performance.now() - t0;
            if (paceMs > spent)
                yield new Promise(r => setTimeout(r, paceMs - spent));
            if (!ok) {
                console.log("trusted input failed, falling back to synthetic events");
                trustedInputAvailable = false;
            }
            return ok;
        });
    }
    // CDP coordinates are relative to the top-level viewport,
    // so account for any iframes the element is nested in.
    function frameOffset(element) {
        let offset = { x: 0, y: 0 };
        try {
            let win = element.ownerDocument.defaultView;
            while (win !== null && win !== window) {
                let frame = win.frameElement;
                if (frame === null)
                    break;
                let rect = frame.getBoundingClientRect();
                offset.x += rect.x + frame.clientLeft;
                offset.y += rect.y + frame.clientTop;
                win = win.parent;
            }
        }
        catch (err) {
        }
        return offset;
    }
    function viewportRect(element) {
        let rect = element.getBoundingClientRect();
        let offset = frameOffset(element);
        if (offset.x === 0 && offset.y === 0)
            return rect;
        return new DOMRect(rect.x + offset.x, rect.y + offset.y, rect.width, rect.height);
    }
    // Like document.elementFromPoint, but descends into iframes and open shadow roots
    // (the nine captcha lives inside a shadow root)
    function elementFromViewportPoint(x, y) {
        let element = document.elementFromPoint(x, y);
        let localX = x;
        let localY = y;
        while (element !== null) {
            if (element instanceof HTMLIFrameElement) {
                try {
                    let rect = element.getBoundingClientRect();
                    localX -= rect.x + element.clientLeft;
                    localY -= rect.y + element.clientTop;
                    let inner = element.contentWindow.document.elementFromPoint(localX, localY);
                    if (inner === null)
                        break;
                    element = inner;
                }
                catch (err) {
                    break;
                }
            }
            else if (element.shadowRoot !== null) {
                let inner = element.shadowRoot.elementFromPoint(localX, localY);
                if (inner === null || inner === element)
                    break;
                element = inner;
            }
            else {
                break;
            }
        }
        return element;
    }
    // Fallback used only when trusted input is unavailable
    function syntheticMouseEvent(type, x, y) {
        let target = elementFromViewportPoint(x, y);
        if (target === null)
            target = CONTAINER;
        target.dispatchEvent(new PointerEvent(type, {
            pointerType: "mouse",
            cancelable: true,
            bubbles: true,
            composed: true,
            view: window,
            clientX: x,
            clientY: y,
            button: 0,
            buttons: mouseIsDown ? 1 : 0
        }));
    }
    function mouseDown(x, y) {
        return __awaiter(this, void 0, void 0, function* () {
            mouseIsDown = true;
            let trusted = yield dispatchTrustedMouse({
                type: "mousePressed",
                x: x,
                y: y,
                button: "left",
                buttons: 1,
                clickCount: 1,
                pointerType: "mouse"
            });
            if (!trusted) {
                syntheticMouseEvent("pointerdown", x, y);
                syntheticMouseEvent("mousedown", x, y);
            }
            console.log("mouse down at " + x + ", " + y);
        });
    }
    function mouseUp(x, y) {
        return __awaiter(this, void 0, void 0, function* () {
            let trusted = yield dispatchTrustedMouse({
                type: "mouseReleased",
                x: x,
                y: y,
                button: "left",
                buttons: 1,
                clickCount: 1,
                pointerType: "mouse"
            });
            if (!trusted) {
                syntheticMouseEvent("pointerup", x, y);
                syntheticMouseEvent("mouseup", x, y);
            }
            mouseIsDown = false;
            console.log("mouse up at " + x + ", " + y);
        });
    }
    function mouseMove(x, y) {
        return __awaiter(this, void 0, void 0, function* () {
            let trusted = yield dispatchTrustedMouse({
                type: "mouseMoved",
                x: x,
                y: y,
                button: mouseIsDown ? "left" : "none",
                buttons: mouseIsDown ? 1 : 0,
                pointerType: "mouse"
            });
            if (!trusted) {
                syntheticMouseEvent("pointermove", x, y);
                syntheticMouseEvent("mousemove", x, y);
            }
        });
    }
    function mouseEnterPage() {
        return __awaiter(this, void 0, void 0, function* () {
            let centerX = window.innerWidth / 2;
            let centerY = window.innerHeight / 2;
            let entryPath = generateNaturalApproach({ x: 0, y: centerY * 0.9 }, { x: centerX, y: centerY }, (Math.random() * 10) + 50);
            for (const pt of entryPath) {
                yield mouseMove(pt.x, pt.y);
                yield new Promise(r => setTimeout(r, 5 + Math.random() * 10));
            }
        });
    }
    // Move along a curved path from the current cursor position to (x, y)
    function moveCursorTo(x, y) {
        return __awaiter(this, void 0, void 0, function* () {
            if (cursor.x === null || cursor.y === null) {
                yield mouseApproach(x, y);
                return;
            }
            const dist = Math.sqrt(Math.pow(x - cursor.x, 2) + Math.pow(y - cursor.y, 2));
            const steps = Math.max(6, Math.min(30, Math.round(dist / 15)));
            const path = generateNaturalApproach({ x: cursor.x, y: cursor.y }, { x: x, y: y }, steps);
            for (const pt of path) {
                yield mouseMove(pt.x, pt.y);
                yield new Promise(r => setTimeout(r, 8 + Math.random() * 14));
            }
        });
    }
    function clickAt(x, y) {
        return __awaiter(this, void 0, void 0, function* () {
            yield moveCursorTo(x, y);
            yield new Promise(r => setTimeout(r, 30 + Math.random() * 50));
            yield mouseDown(x, y);
            yield new Promise(r => setTimeout(r, 40 + Math.random() * 60));
            yield mouseUp(x, y);
            if (trustedInputAvailable !== true)
                syntheticMouseEvent("click", x, y);
            console.log(`clicked at ${x}, ${y}`);
        });
    }
    function clickProportional(element, proportionX, proportionY) {
        return __awaiter(this, void 0, void 0, function* () {
            let boundingBox = viewportRect(element);
            let x = boundingBox.x + (proportionX * boundingBox.width);
            let y = boundingBox.y + (proportionY * boundingBox.height);
            yield clickAt(x, y);
        });
    }
    function clickElement(selector) {
        return __awaiter(this, void 0, void 0, function* () {
            let ele = document.querySelector(selector);
            console.log("clicking element " + selector);
            let center = getElementCenter(ele);
            yield clickAt(center.x, center.y);
        });
    }
    function getElementCenter(element) {
        let rect = viewportRect(element);
        let center = {
            x: rect.x + (rect.width / 2),
            y: rect.y + (rect.height / 2),
        };
        console.log("element center: ");
        console.dir(center);
        return center;
    }
    function getElementWidth(element) {
        let rect = viewportRect(element);
        console.log("element width: " + rect.width);
        return rect.width;
    }
    function generateNaturalApproach(start, end, steps) {
        const control1 = {
            x: start.x + (end.x - start.x) * (0.2 + Math.random() * 0.2),
            y: start.y + (Math.random() * 15 - 5)
        };
        const control2 = {
            x: start.x + (end.x - start.x) * (0.6 + Math.random() * 0.2),
            y: end.y + (Math.random() * 10 - 5)
        };
        const points = [];
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = Math.pow(1 - t, 3) * start.x +
                3 * Math.pow(1 - t, 2) * t * control1.x +
                3 * (1 - t) * Math.pow(t, 2) * control2.x +
                Math.pow(t, 3) * end.x;
            const y = Math.pow(1 - t, 3) * start.y +
                3 * Math.pow(1 - t, 2) * t * control1.y +
                3 * (1 - t) * Math.pow(t, 2) * control2.y +
                Math.pow(t, 3) * end.y;
            points.push({ x, y });
        }
        return points;
    }
    function moveMouseTo(x, y) {
        return __awaiter(this, void 0, void 0, function* () {
            yield mouseMove(x, y);
            console.log("moved mouse to " + x + ", " + y);
        });
    }
    function mouseApproach(x, y) {
        return __awaiter(this, void 0, void 0, function* () {
            // Natural approach to the handle
            const approachStartX = x - 80 - Math.random() * 40;
            const approachStartY = y + 40 + Math.random() * 30;
            const approachPoints = generateNaturalApproach({ x: approachStartX, y: approachStartY }, { x: x, y: y }, 8 + Math.floor(Math.random() * 4));
            // Move cursor to approach the handle naturally
            for (const point of approachPoints) {
                yield moveMouseTo(point.x, point.y);
                yield new Promise(r => setTimeout(r, 15 + Math.random() * 25));
            }
            // Hover on handle with slight jitter
            yield new Promise(r => setTimeout(r, 200 + Math.random() * 150));
            yield moveMouseTo(x + (Math.random() * 1.5 - 0.75), y + (Math.random() * 1.5 - 0.75));
        });
    }
    function solveIcon() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let iconImageDiv = yield waitForElement(ICON_IMAGE_DIV);
                // The captcha image is rendered as a CSS background-image on the wrapper.
                // Extract the url from between the quotes of the background-image value.
                let backgroundImage = window.getComputedStyle(iconImageDiv).backgroundImage;
                let imageUrl = backgroundImage.match(/(?<=").*(?=")/)[0];
                console.log("extracted icon image url: " + imageUrl);
                // Download the image and send it as a base64 encoded string to the icon api.
                let imageDataUrl = yield fetchImageAsBase64(imageUrl);
                let imageB64 = getBase64StringFromDataURL(imageDataUrl);
                let solution = yield iconApiCall(imageB64);
                console.log("got icon api solution:");
                console.dir(solution);
                // Click each returned point on the image with a natural delay between clicks.
                for (const point of solution.proportionalPoints) {
                    yield clickProportional(iconImageDiv, point.proportionX, point.proportionY);
                    yield new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
                }
                // Submit the solution.
                yield clickElement(ICON_SUBMIT_BUTTON);
                yield new Promise(r => setTimeout(r, 3000));
            }
            catch (err) {
                console.log(err);
                console.log("refreshing captcha");
                yield clickElement(ICON_REFRESH_BUTTON);
                yield new Promise(r => setTimeout(r, 2000));
            }
        });
    }
    function solveNine() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const container = yield waitForElement(NINE_CAPTCHA_CONTAINER);
                if (container.shadowRoot === null) {
                    throw new Error(`nine captcha container (${NINE_CAPTCHA_CONTAINER}) does not have a shadow root`);
                }
                const mainIcon = container.shadowRoot.querySelector(NINE_CAPTCHA_MAIN_ICON);
                const captchaHeader = container.shadowRoot.querySelector(NINE_CAPTCHA_HEADER_TEXT);
                const icons = container.shadowRoot.querySelectorAll(NINE_CAPTCHA_ICONS);
                if (icons.length != 9) {
                    throw new Error(`Found ${icons.length} icons, but expected 9`);
                }
                const images = [];
                for (let i = 0; i < icons.length; i++) {
                    const icon = icons[i];
                    const src = icon.src;
                    images.push(getBase64StringFromDataURL(yield fetchImageAsBase64(src)));
                }
                let request = {
                    images: images
                };
                if (mainIcon !== null) {
                    console.log("this particular nine-captcha is image-to-image kind based on the main icon");
                    const src = mainIcon.src;
                    const mainIconB64 = getBase64StringFromDataURL(yield fetchImageAsBase64(src));
                    request.baseImageB64 = mainIconB64;
                }
                else if (captchaHeader !== null) {
                    console.log("this particular nine-captcha is text-to-image kind based on the captcha header");
                    const challengeText = captchaHeader.textContent;
                    request.challengeText = challengeText;
                }
                else {
                    throw new Error(`both the captchaHeader ${NINE_CAPTCHA_HEADER_TEXT} and mainIcon ${NINE_CAPTCHA_MAIN_ICON} were null`);
                }
                let solution = yield nineApiCall(request);
                console.log("got icon api solution:");
                console.dir(solution);
                // Click each returned point on the image with a natural delay between clicks.
                for (const index of solution.solutionIndices.slice(0, 3)) {
                    const answerIcon = icons[index];
                    yield clickProportional(answerIcon, 0.52, 0.34);
                    yield new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
                    console.log("clicked icon");
                    // check if solution success
                }
                // Submit the solution.
                yield clickElement(ICON_SUBMIT_BUTTON);
                yield new Promise(r => setTimeout(r, 3000));
            }
            catch (err) {
                console.log(err);
                console.log("refreshing captcha");
                yield clickElement(ICON_REFRESH_BUTTON);
                yield new Promise(r => setTimeout(r, 2000));
            }
        });
    }
    function clickOnePass() {
        return __awaiter(this, void 0, void 0, function* () {
            const container = yield waitForElement(ONE_PASS_CONTAINER);
            if (container.shadowRoot === null) {
                throw new Error(`one pass container (${ONE_PASS_CONTAINER}) does not have a shadow root`);
            }
            const checkbox = container.shadowRoot.querySelector(ONE_PASS_CHECKBOX);
            if (checkbox === null) {
                throw new Error(`checkbox with selector ${ONE_PASS_CHECKBOX} was not found`);
            }
            yield clickProportional(checkbox, 0.52, 0.47);
            console.log("clicked checkbox");
        });
    }
    function onePassIsPresent() {
        if (document.querySelector(ONE_PASS_CONTAINER)) {
            console.log("one pass present based on selector: " + ONE_PASS_CONTAINER);
            return true;
        }
        console.log("one pass not present");
        return false;
    }
    function captchaIsPresent() {
        for (let i = 0; i < CAPTCHA_PRESENCE_INDICATORS.length; i++) {
            if (document.querySelector(CAPTCHA_PRESENCE_INDICATORS[i])) {
                console.log("captcha present based on selector: " + CAPTCHA_PRESENCE_INDICATORS[i]);
                return true;
            }
        }
        console.log("captcha not present");
        return false;
    }
    let isCurrentSolve = false;
    function solveCaptchaLoop() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!isCurrentSolve) {
                if (onePassIsPresent() || captchaIsPresent()) {
                    console.log("one pass or captcha is present, no need to wait");
                }
                else {
                    console.log("waiting for one pass or captcha container");
                    yield findFirstElementToAppear([...CAPTCHA_PRESENCE_INDICATORS, ONE_PASS_CONTAINER]);
                }
                if (onePassIsPresent()) {
                    console.log("one pass is present ");
                    yield clickOnePass();
                    yield new Promise(r => setTimeout(r, 1000));
                }
                else {
                    console.log("one pass is not present");
                }
                if (captchaIsPresent()) {
                    console.log("captcha detected by css selector");
                }
                else {
                    if (onePassIsPresent()) {
                        console.log("one pass is still present after clicking, returning to beginning of solve loop");
                        yield solveCaptchaLoop();
                    }
                    console.log("waiting for captcha");
                    yield findFirstElementToAppear(CAPTCHA_PRESENCE_INDICATORS);
                    console.log("captcha detected by mutation observer");
                }
                isCurrentSolve = true;
                let captchaType = CaptchaType.ICON;
                try {
                    captchaType = yield identifyCaptcha();
                }
                catch (err) {
                    console.log("could not detect captcha type. restarting captcha loop");
                    isCurrentSolve = false;
                    yield solveCaptchaLoop();
                }
                try {
                    if ((yield creditsApiCall()) <= 0) {
                        console.log("out of credits");
                        alert("Out of SadCaptcha credits. Please boost your balance on sadcaptcha.com/dashboard.");
                        return;
                    }
                }
                catch (e) {
                    console.log("error making check credits api call");
                    console.error(e);
                    console.log("proceeding to attempt solution anyways");
                }
                yield acquireTrustedInput();
                try {
                    switch (captchaType) {
                        case CaptchaType.ICON:
                            yield solveIcon();
                            break;
                        case CaptchaType.NINE:
                            yield solveNine();
                            break;
                    }
                }
                catch (err) {
                    console.log("error solving captcha");
                    console.error(err);
                    console.log("restarting captcha loop");
                }
                finally {
                    yield releaseTrustedInput();
                    isCurrentSolve = false;
                    yield new Promise(r => setTimeout(r, 5000));
                    yield solveCaptchaLoop();
                }
            }
        });
    }
    solveCaptchaLoop();
})();
//# sourceMappingURL=script.js.map
interface Request {
	apiKey: string
}

(function() {

	// Avoid multiple instances running:
	if ((window as any).hasRun === true)
		return true;
	(window as any).hasRun = true;

	const CONTAINER: Element = document.documentElement || document.body

	// Api key is passed from extension via message
	chrome.runtime.onMessage.addListener(
		function(request: Request, _, sendResponse) {
			if (request.apiKey !== null) {
				console.log("Api key: " + request.apiKey)
				localStorage.setItem("sadCaptchaKey", request.apiKey)
				sendResponse({ message: "API key set.", success: 1 })
			} else {
				sendResponse({ message: "API key cannot be empty.", success: 0 })
			}
		}
	)

	function getApiKey(): string {
		let apiKey = localStorage.getItem("sadCaptchaKey")
		if (apiKey) {
			return apiKey
		} else {
			throw new Error("could not get sadCaptchaKey from localStorage")
		}
	}

	let creditsUrl = "https://www.sadcaptcha.com/api/v1/license/credits?licenseKey="
	let iconUrl = "https://www.sadcaptcha.com/api/v1/shein-icon?licenseKey="

	const API_HEADERS = new Headers({ "Content-Type": "application/json" })

	const ICON_IMAGE_DIV = ".pic_wrapper"
	const ICON_SUBMIT_BUTTON = "ICON SUBMIT BUTTON PLACEHOLDER"
	const ICON_UNIQUE_IDENTIFIERS = [ICON_IMAGE_DIV]

	const CAPTCHA_PRESENCE_INDICATORS = [
		ICON_IMAGE_DIV
	]

	type Point = {
		x: number
		y: number
	}

	type ProportionalPoint = {
		proportionX: number
		proportionY: number
	}

	type MultiPointResponse = {
		proportionalPoints: Array<ProportionalPoint>
	}

	enum CaptchaType {
		ICON
	}

	function findFirstElementToAppear(selectors: Array<string>): Promise<Element> {
		return new Promise(resolve => {
			const observer: MutationObserver = new MutationObserver(mutations => {
			for (const mutation of mutations) {
				if (mutation.addedNodes === null)
					continue
				let addedNode: Array<Node> = []
				mutation.addedNodes.forEach(node => addedNode.push(node))
				for (const node of addedNode)
					for (const selector of selectors) {
						if (node instanceof HTMLIFrameElement) {
							let iframe = <HTMLIFrameElement>node
							setTimeout(() => {
								let iframeElement = iframe.contentWindow!.document.body.querySelector(selector)
								if (iframeElement) {
									console.debug(`element matched ${selector} in iframe`)
									observer.disconnect()
									console.dir(iframeElement)
									return  resolve(iframeElement)
								}
							}, 3000)
						} else if (node instanceof Element) {
							let element = <Element>node
							if (element.querySelector(selector)) {
								console.debug(`element matched ${selector}`)
								observer.disconnect()
								console.dir(element)
								return resolve(element)
							}
						}
					}
				}
			})
			observer.observe(CONTAINER, {
				childList: true,
				subtree: true
			})
		})
	}

	function waitForElement(selector: string, iframeSelector?: string): Promise<Element> {
		return new Promise(resolve => {
			let targetDocument: Document;
			if (iframeSelector !== undefined) {
				let iframe = document.querySelector(iframeSelector) as HTMLIFrameElement
				targetDocument = iframe.contentWindow!.document
			} else {
				targetDocument = window.document
			}
			if (targetDocument.querySelector(selector)) {
				console.log("Selector found: " + selector)
				return resolve(targetDocument.querySelector(selector)!)
			} else {
				const observer: MutationObserver = new MutationObserver(_ => {
					if (targetDocument.querySelector(selector)) {
						observer.disconnect()
						console.log("Selector found by mutation observer: " + selector)
						return resolve(targetDocument.querySelector(selector)!)
					}
				})
				observer.observe(CONTAINER, {
					childList: true,
					subtree: true
				})
			}
		})
	}

	async function creditsApiCall(): Promise<number> {
		console.log("making api call")
		let resp = await fetch(creditsUrl + getApiKey(), {
			method: "GET",
			headers: API_HEADERS,
		})
		let credits = (await resp.json()).credits
		console.log("api credits = " + credits)
		return credits
	}

	async function apiCall(url: string, body: any): Promise<any> {
		console.log("making api call")
		let resp = await fetch(url + getApiKey(), {
			method: "POST",
			headers: API_HEADERS,
			body: JSON.stringify(body)
		})
		console.log("got api response:")
		console.log(resp)
		return resp
	}

	async function iconApiCall(imageB64: string): Promise<MultiPointResponse> {
		let resp = await apiCall(iconUrl, {
			imageB64: imageB64
		})
		let j = await resp.json()
		console.log("icon response: " + JSON.stringify(j))
		return j
	}

	function anySelectorInListPresent(selectors: Array<string>): boolean {
		for (const selector of selectors) {
			let ele = document.querySelector(selector)
			if (ele) {
				console.log(`selector ${selector} is present`)
				return true
			}
			let iframe = document.querySelector("iframe")
			if (iframe) {
				console.log("checking for selector in iframe")
				ele = iframe.contentWindow!.document.body.querySelector(selector)
				if (ele) {
					console.log("Selector is present in iframe: " + selector)
					return true
				}
			}
		}
		console.log(`no selector in list is present`)
		return false
	}

	async function identifyCaptcha(): Promise<CaptchaType> {
		for (let i = 0; i < 30; i++) {
			if (anySelectorInListPresent(ICON_UNIQUE_IDENTIFIERS)) {
				console.log("icon detected")
				return CaptchaType.ICON
			} else {
				await new Promise(r => setTimeout(r, 1000));
			}
		}
		throw new Error("Could not identify CaptchaType")
	}

	function getBase64StringFromDataURL(dataUrl: string): string {
		let img = dataUrl.replace('data:', '').replace(/^.+,/, '')
		console.log("got b64 string from data URL")
		return img
	}

	async function fetchImageAsBase64(url: string): Promise<string> {
		let resp = await fetch(url)
		let blob = await resp.blob()
		return new Promise((resolve, reject) => {
			let reader = new FileReader()
			reader.onloadend = () => resolve(reader.result as string)
			reader.onerror = reject
			reader.readAsDataURL(blob)
		})
	}

	function mouseUp(x: number, y: number): void {
		CONTAINER.dispatchEvent(
			new MouseEvent("mouseup", {
				bubbles: true,
				view: window,
				clientX: x,
				clientY: y
			})
		)
		console.log("mouse up at " + x + ", " + y)
	}

	function mouseOver(x: number, y: number): void {
		let underMouse = document.elementFromPoint(x, y)!
		underMouse.dispatchEvent(
			new MouseEvent("mouseover", {
				cancelable: true,
				bubbles: true,
				view: window,
				clientX: x,
				clientY: y
			})
		)
		console.log("mouse over at " + x + ", " + y)
	}

	function mouseOut(x: number, y: number): void {
		let underMouse = document.elementFromPoint(x, y)!
		underMouse.dispatchEvent(
			new MouseEvent("mouseout", {
				cancelable: true,
				bubbles: true,
				view: window,
				clientX: x,
				clientY: y
			})
		)
		console.log("mouse over at " + x + ", " + y)
	}

	function mouseDown(x: number, y: number): void {
		let underMouse = document.elementFromPoint(x, y)!
		underMouse.dispatchEvent(
			new MouseEvent("mousedown", {
				cancelable: true,
				bubbles: true,
				view: window,
				clientX: x,
				clientY: y
			})
		)
		console.log("mouse down at " + x + ", " + y)
	}

	function mouseEnterPage(): void {
		let width = window.innerWidth
		let centerX = window.innerWidth / 2
		let centerY = window.innerHeight / 2
		CONTAINER.dispatchEvent(
			new MouseEvent("mouseenter", {
				bubbles: true,
				view: window,
				clientX: width,
				clientY: centerY
			})
		)
		CONTAINER.dispatchEvent(
			new MouseEvent("mouseover", {
				cancelable: true,
				bubbles: true,
				view: window,
				clientX: width,
				clientY: centerY
			})
		)
		for (let i = 1; i < centerX; i++) {
			try {
				mouseMove(width - i, centerY)
				mouseOver(width - i, centerY)
			} catch (err) {
				console.log("error moving mouse into page: ")
				console.dir(err)
			}
		}
	}

	function randomMouseMovement() {
		//let randomX = aroundX + Math.round((Math.random() * 20) - 10)
		//let randomY = aroundY + Math.round((Math.random() * 20) - 10)
		let randomX = Math.round(window.innerWidth * Math.random())
		let randomY = Math.round(window.innerHeight * Math.random())
		mouseMove(randomX, randomX)
		mouseOver(randomX, randomY)
		mouseOut(randomX, randomY)
	}

	function mouseClick(element: Element, x: number, y: number): void {
		const eventOptions = {
			pointerType: "mouse",
			cancelable: true,
			bubbles: true,
			view: window,
			clientX: x,
			clientY: y,
			button: 0,
			buttons: 1,
		};

		element.dispatchEvent(new PointerEvent("pointerover", eventOptions));
		element.dispatchEvent(new PointerEvent("pointerenter", eventOptions));
		element.dispatchEvent(new MouseEvent("mouseover", eventOptions));
		element.dispatchEvent(new MouseEvent("mouseenter", eventOptions));
		element.dispatchEvent(new MouseEvent("mousemove", eventOptions));
		element.dispatchEvent(new PointerEvent("pointermove", eventOptions));
		element.dispatchEvent(new PointerEvent("pointerdown", eventOptions));
		element.dispatchEvent(new MouseEvent("mousedown", eventOptions));
		element.dispatchEvent(new PointerEvent("pointerup", eventOptions));
		element.dispatchEvent(new MouseEvent("mouseup", eventOptions));
		element.dispatchEvent(new MouseEvent("click", eventOptions));
	}

	function clickProportional(element: Element, proportionX: number, proportionY: number): void {
		let boundingBox = element.getBoundingClientRect()
		let xOrigin = boundingBox.x
		let yOrigin = boundingBox.y
		let xOffset = (proportionX * boundingBox.width)
		let yOffset = (proportionY * boundingBox.height)
		let x = xOrigin + xOffset
		let y = yOrigin + yOffset
		console.log(`clicked at ${x}, ${y}`)
		mouseClick(element, x, y)
	}

	function clickElement(selector: string) {
		let ele = document.querySelector(selector)!
		console.log("sending mouse event click")
		let rect = ele.getBoundingClientRect()
		let x = rect.x
		let y = rect.y

		const eventOptions = {
			pointerType: "mouse",
			cancelable: true,
			bubbles: true,
			view: window,
			clientX: x,
			clientY: y,
			button: 0,
			buttons: 1,
		};

		ele.dispatchEvent(new PointerEvent("pointerover", eventOptions));
		ele.dispatchEvent(new PointerEvent("pointerenter", eventOptions));
		ele.dispatchEvent(new MouseEvent("mouseover", eventOptions));
		ele.dispatchEvent(new MouseEvent("mouseenter", eventOptions));
		ele.dispatchEvent(new MouseEvent("mousemove", eventOptions));
		ele.dispatchEvent(new PointerEvent("pointermove", eventOptions));
		ele.dispatchEvent(new PointerEvent("pointerdown", eventOptions));
		ele.dispatchEvent(new MouseEvent("mousedown", eventOptions));
		ele.dispatchEvent(new PointerEvent("pointerup", eventOptions));
		ele.dispatchEvent(new MouseEvent("mouseup", eventOptions));
		ele.dispatchEvent(new MouseEvent("click", eventOptions));
	}

	function mouseMove(x: number, y: number, ele?: Element): void {
		let c: Element
		if (ele === undefined) {
			c = CONTAINER
		} else {
			c = ele
		}
		c.dispatchEvent(
			new PointerEvent("mousemove", {
				pointerType: "mouse",
				cancelable: true,
				bubbles: true,
				view: window,
				clientX: x,
				clientY: y
			})
		)
		console.log("moved mouse to " + x + ", " + y)
	}

	function getElementCenter(element: Element): Point {
		let rect = element.getBoundingClientRect()
		let center = {
			x: rect.x + (rect.width / 2),
			y: rect.y + (rect.height / 2),
		}
		console.log("element center: ")
		console.dir(center)
		return center
	}

	function getElementWidth(element: Element): number {
		let rect = element.getBoundingClientRect()
		console.log("element width: " + rect.width)
		return rect.width
	}

	function generateNaturalApproach(start: {x: number, y: number}, end: {x: number, y: number}, steps: number): Array<{x: number, y: number}> {
		const control1 = {
			x: start.x + (end.x - start.x) * (0.2 + Math.random() * 0.2),
			y: start.y + (Math.random() * 15 - 5)
		};

		const control2 = {
			x: start.x + (end.x - start.x) * (0.6 + Math.random() * 0.2),
			y: end.y + (Math.random() * 10 - 5)
		};

		const points: Point[] = [];
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

	async function moveMouseTo(x: number, y: number): Promise<void> {
		CONTAINER.dispatchEvent(
			new MouseEvent("mousemove", {
				bubbles: true,
				view: window,
				clientX: x,
				clientY: y
			})
		)
		console.log("moved mouse to " + x + ", " + y)
	}

	async function mouseApproach(x: number, y: number): Promise<void> {
		// Natural approach to the handle
		const approachStartX = x - 80 - Math.random() * 40;
		const approachStartY = y + 40 + Math.random() * 30;
		const approachPoints = generateNaturalApproach(
			{ x: approachStartX, y: approachStartY },
			{ x: x, y: y },
			8 + Math.floor(Math.random() * 4)
		);

		// Move cursor to approach the handle naturally
		for (const point of approachPoints) {
			moveMouseTo(point.x, point.y);
			await new Promise(r => setTimeout(r, 15 + Math.random() * 25));
		}

		// Hover on handle with slight jitter
		await new Promise(r => setTimeout(r, 200 + Math.random() * 150));
		moveMouseTo(
			x + (Math.random() * 1.5 - 0.75),
			y + (Math.random() * 1.5 - 0.75)
		);
	}

	async function solveIcon(): Promise<void> {
		let iconImageDiv = await waitForElement(ICON_IMAGE_DIV)

		// The captcha image is rendered as a CSS background-image on the wrapper.
		// Extract the url from between the quotes of the background-image value.
		let backgroundImage = window.getComputedStyle(iconImageDiv).backgroundImage
		let imageUrl = backgroundImage.match(/(?<=").*(?=")/)![0]
		console.log("extracted icon image url: " + imageUrl)

		// Download the image and send it as a base64 encoded string to the icon api.
		let imageDataUrl = await fetchImageAsBase64(imageUrl)
		let imageB64 = getBase64StringFromDataURL(imageDataUrl)
		let solution = await iconApiCall(imageB64)
		console.log("got icon api solution:")
		console.dir(solution)

		// Click each returned point on the image with a natural delay between clicks.
		for (const point of solution.proportionalPoints) {
			clickProportional(iconImageDiv, point.proportionX, point.proportionY)
			await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
		}

		// Submit the solution.
		clickElement(ICON_SUBMIT_BUTTON)
		await new Promise(r => setTimeout(r, 3000));
	}

	function captchaIsPresent(): boolean {
		for (let i = 0; i < CAPTCHA_PRESENCE_INDICATORS.length; i++) {
			if (document.querySelector(CAPTCHA_PRESENCE_INDICATORS[i])) {
				console.log("captcha present based on selector: " + CAPTCHA_PRESENCE_INDICATORS[i])
				return true;
			}
		}
		console.log("captcha not present")
		return false
	}


	let isCurrentSolve: boolean = false
	async function solveCaptchaLoop() {
		if (!isCurrentSolve) {

			if (captchaIsPresent()){
				console.log("captcha detected by css selector")
			} else {
				console.log("waiting for captcha")
				await findFirstElementToAppear(CAPTCHA_PRESENCE_INDICATORS)
				console.log("captcha detected by mutation observer")
			}

			isCurrentSolve = true
			let captchaType: CaptchaType = CaptchaType.ICON
			try {
				captchaType = await identifyCaptcha()
			} catch (err) {
				console.log("could not detect captcha type. restarting captcha loop")
				isCurrentSolve = false
				await solveCaptchaLoop()
			}

			try {
				if (await creditsApiCall() <= 0) {
					console.log("out of credits")
					alert("Out of SadCaptcha credits. Please boost your balance on sadcaptcha.com/dashboard.")
					return
				}
			} catch (e) {
				console.log("error making check credits api call")
				console.error(e)
				console.log("proceeding to attempt solution anyways")
			}

			try {
				switch (captchaType) {
					case CaptchaType.ICON:
						await solveIcon()
						break
				}
			} catch (err) {
				console.log("error solving captcha")
				console.error(err)
				console.log("restarting captcha loop")
			} finally {
				isCurrentSolve = false
				await new Promise(r => setTimeout(r, 5000));
				await solveCaptchaLoop()
			}
		}
	}

	solveCaptchaLoop()

})();

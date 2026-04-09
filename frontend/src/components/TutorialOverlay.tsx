import { useEffect, useState } from "react";
import { useTutorial } from "../context/TutorialContext";

function TutorialOverlay() {
	const { isOpen, steps, currentStep, currentStepIndex, closeTutorial, nextStep, prevStep } = useTutorial();
	const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
	const [anchorKey, setAnchorKey] = useState<string | null>(null);
	const [navbarBottom, setNavbarBottom] = useState(0);
	const [openPanelRect, setOpenPanelRect] = useState<DOMRect | null>(null);

	useEffect(() => {
		if (!isOpen || !currentStep) {
			setAnchorRect(null);
			setAnchorKey(null);
			setNavbarBottom(0);
			setOpenPanelRect(null);
			return;
		}

		// Prevent one-frame jump from the previous step anchor.
		setAnchorRect(null);
		setAnchorKey(null);

		let rafId = 0;
		let timeoutId = 0;
		let isDisposed = false;
		let scheduledMeasure = false;

		const findVisibleTarget = () => {
			const candidates = Array.from(
				document.querySelectorAll<HTMLElement>(`[data-tutorial-key="${currentStep.highlightKey}"]`)
			);

			for (const candidate of candidates) {
				const rect = candidate.getBoundingClientRect();
				const style = window.getComputedStyle(candidate);
				const isVisible =
					rect.width > 0 &&
					rect.height > 0 &&
					style.display !== "none" &&
					style.visibility !== "hidden" &&
					style.opacity !== "0";
				if (isVisible) return { element: candidate, rect };
			}

			return null;
		};

		const updateAnchor = () => {
			if (isDisposed) return;

			const result = findVisibleTarget();
			if (result) {
				setAnchorRect(result.rect);
				setAnchorKey(currentStep.highlightKey);
			} else {
				setAnchorRect(null);
				setAnchorKey(null);
			}

			const header = document.querySelector<HTMLElement>(".app-header");
			if (!header) {
				setNavbarBottom(0);
				return;
			}

			const headerRect = header.getBoundingClientRect();
			const headerBottom = headerRect.bottom;

			const isVisiblePanel = (panel: HTMLElement) => {
				const rect = panel.getBoundingClientRect();
				const style = window.getComputedStyle(panel);
				const isVisible =
					rect.width > 0 &&
					rect.height > 0 &&
					style.display !== "none" &&
					style.visibility !== "hidden" &&
					style.opacity !== "0";
				return isVisible ? rect : null;
			};

			// Prefer the panel containing the currently highlighted item.
			let activePanelRect: DOMRect | null = null;
			if (result?.element) {
				const parentPanel = result.element.closest<HTMLElement>(".app-menu-panel");
				if (parentPanel) {
					activePanelRect = isVisiblePanel(parentPanel);
				}
			}

			// Fallback to the panel tied to the current tutorial menu section.
			if (!activePanelRect) {
				const isOperationsStep =
					currentStep.highlightKey === "operations" || currentStep.highlightKey.startsWith("operations-");
				const isAdminStep = currentStep.highlightKey === "admin" || currentStep.highlightKey.startsWith("admin-");
				const menuKey = isOperationsStep ? "operations" : isAdminStep ? "admin" : null;

				if (menuKey) {
					const menuTrigger = header.querySelector<HTMLElement>(`[data-tutorial-key="${menuKey}"]`);
					const menuDropdown = menuTrigger?.closest<HTMLElement>(".app-menu-dropdown");
					const menuPanel = menuDropdown?.querySelector<HTMLElement>(".app-menu-panel");
					if (menuPanel) {
						activePanelRect = isVisiblePanel(menuPanel);
					}
				}
			}

			setNavbarBottom(Math.max(0, Math.round(headerBottom)));
			setOpenPanelRect(activePanelRect);
		};

		const scheduleUpdateAnchor = () => {
			if (isDisposed || scheduledMeasure) return;
			scheduledMeasure = true;
			window.requestAnimationFrame(() => {
				scheduledMeasure = false;
				updateAnchor();
			});
		};

		updateAnchor();
		// Dropdowns can open one tick later; re-measure a few times to lock onto the visible item.
		rafId = window.requestAnimationFrame(() => {
			updateAnchor();
			timeoutId = window.setTimeout(updateAnchor, 90);
		});

		const visualViewport = window.visualViewport;
		window.addEventListener("resize", scheduleUpdateAnchor);
		window.addEventListener("scroll", scheduleUpdateAnchor, true);
		if (visualViewport) {
			visualViewport.addEventListener("resize", scheduleUpdateAnchor);
			visualViewport.addEventListener("scroll", scheduleUpdateAnchor);
		}
		return () => {
			isDisposed = true;
			if (rafId) window.cancelAnimationFrame(rafId);
			if (timeoutId) window.clearTimeout(timeoutId);
			window.removeEventListener("resize", scheduleUpdateAnchor);
			window.removeEventListener("scroll", scheduleUpdateAnchor, true);
			if (visualViewport) {
				visualViewport.removeEventListener("resize", scheduleUpdateAnchor);
				visualViewport.removeEventListener("scroll", scheduleUpdateAnchor);
			}
		};
	}, [isOpen, currentStep]);

	if (!isOpen || !currentStep) return null;

	const isFirst = currentStepIndex === 0;
	const isLast = currentStepIndex === steps.length - 1;
	const isDropdownItemStep =
		currentStep.highlightKey.startsWith("operations-") ||
		currentStep.highlightKey.startsWith("admin-");
	const anchorReadyForCurrentStep = Boolean(anchorRect) && anchorKey === currentStep.highlightKey;

	function handleBack() {
		if (isFirst) return;
		prevStep();
	}

	function handleNext() {
		if (isLast) {
			closeTutorial();
			return;
		}
		nextStep();
	}

	const popupStyle = (() => {
		const popupWidth = 360;
		const margin = 12;
		const viewportWidth = window.innerWidth || 1200;
		const viewportHeight = window.innerHeight || 800;

		if (isDropdownItemStep && !anchorReadyForCurrentStep) {
			return null;
		}

		if (!anchorRect) {
			return { left: "50%", top: 90, transform: "translateX(-50%)", width: popupWidth, maxWidth: "calc(100vw - 24px)" } as const;
		}

		if (isDropdownItemStep) {
			const preferredRightSideLeft = anchorRect.right + margin;
			const canFitRight = preferredRightSideLeft + popupWidth <= viewportWidth - margin;
			const preferredLeftSideLeft = anchorRect.left - popupWidth - margin;
			const canFitLeft = preferredLeftSideLeft >= margin;

			const left = canFitRight
				? preferredRightSideLeft
				: canFitLeft
					? preferredLeftSideLeft
					: Math.max(margin, Math.min(anchorRect.left, viewportWidth - popupWidth - margin));

			const centeredTop = anchorRect.top + anchorRect.height / 2 - 105;
			const top = Math.max(margin, Math.min(centeredTop, viewportHeight - 220 - margin));
			return {
				left,
				top,
				width: popupWidth,
				maxWidth: "calc(100vw - 24px)"
			} as const;
		}

		const centeredLeft = anchorRect.left + anchorRect.width / 2 - popupWidth / 2;
		const clampedLeft = Math.max(margin, Math.min(centeredLeft, viewportWidth - popupWidth - margin));

		const preferredTop = anchorRect.bottom + margin;
		const fitsBelow = preferredTop + 210 <= viewportHeight - margin;
		const top = fitsBelow ? preferredTop : Math.max(margin, anchorRect.top - 210 - margin);

		return {
			left: clampedLeft,
			top,
			width: popupWidth,
			maxWidth: "calc(100vw - 24px)"
		} as const;
	})();

	const dimSegments = (() => {
		const viewportWidth = window.innerWidth || 1200;
		const viewportHeight = window.innerHeight || 800;
		const top = Math.max(0, Math.min(navbarBottom, viewportHeight));

		// No open dropdown panel: dim everything below navbar.
		if (!openPanelRect || openPanelRect.bottom <= top) {
			return [{ left: 0, top, width: viewportWidth, height: Math.max(0, viewportHeight - top) }];
		}

		const panelTop = Math.max(top, Math.min(openPanelRect.top, viewportHeight));
		const panelBottom = Math.max(panelTop, Math.min(openPanelRect.bottom, viewportHeight));
		const panelLeft = Math.max(0, Math.min(openPanelRect.left, viewportWidth));
		const panelRight = Math.max(panelLeft, Math.min(openPanelRect.right, viewportWidth));

		return [
			// Strip between navbar bottom and dropdown top.
			{ left: 0, top, width: viewportWidth, height: Math.max(0, panelTop - top) },
			// Left side next to dropdown.
			{ left: 0, top: panelTop, width: panelLeft, height: Math.max(0, panelBottom - panelTop) },
			// Right side next to dropdown.
			{ left: panelRight, top: panelTop, width: Math.max(0, viewportWidth - panelRight), height: Math.max(0, panelBottom - panelTop) },
			// Everything below dropdown.
			{ left: 0, top: panelBottom, width: viewportWidth, height: Math.max(0, viewportHeight - panelBottom) }
		].filter((segment) => segment.width > 0 && segment.height > 0);
	})();

	return (
		<>
			{dimSegments.map((segment, index) => (
				<div
					key={`tutorial-dim-${index}`}
					className="position-fixed tutorial-dim-backdrop"
					style={{
						left: segment.left,
						top: segment.top,
						width: segment.width,
						height: segment.height
					}}
				/>
			))}
			{popupStyle ? (
				<div className="position-fixed tutorial-popup" style={{ ...popupStyle, zIndex: 1300 }} role="dialog" aria-label="Admin tutorial">
			<div className="card shadow-lg border">
				<div className="card-body">
					<div className="d-flex justify-content-between align-items-start gap-2 mb-2">
						<div>
							<div className="small text-muted">Admin Tutorial</div>
							<h3 className="h6 mb-0">{currentStep.title}</h3>
						</div>
						<button type="button" className="btn-close" aria-label="Close tutorial" onClick={closeTutorial} />
					</div>
					<p className="small mb-3">{currentStep.description}</p>
					<div className="d-flex justify-content-between align-items-center">
						<div className="small text-muted">
							{currentStepIndex + 1} / {steps.length}
						</div>
						<div className="d-flex gap-2">
							<button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleBack} disabled={isFirst}>
								Back
							</button>
							<button type="button" className="btn btn-primary btn-sm" onClick={handleNext}>
								{isLast ? "Finish" : "Next"}
							</button>
						</div>
					</div>
				</div>
			</div>
				</div>
			) : null}
		</>
	);
}

export default TutorialOverlay;


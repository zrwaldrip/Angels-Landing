import { useEffect, useState } from "react";
import { useTutorial } from "../context/TutorialContext";

function TutorialOverlay() {
	const { isOpen, steps, currentStep, currentStepIndex, closeTutorial, nextStep, prevStep } = useTutorial();
	const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

	useEffect(() => {
		if (!isOpen || !currentStep) {
			setAnchorRect(null);
			return;
		}

		let rafId = 0;
		let timeoutId = 0;

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
			const result = findVisibleTarget();
			setAnchorRect(result?.rect ?? null);
		};

		updateAnchor();
		// Dropdowns can open one tick later; re-measure a few times to lock onto the visible item.
		rafId = window.requestAnimationFrame(() => {
			updateAnchor();
			timeoutId = window.setTimeout(updateAnchor, 90);
		});

		window.addEventListener("resize", updateAnchor);
		window.addEventListener("scroll", updateAnchor, true);
		return () => {
			if (rafId) window.cancelAnimationFrame(rafId);
			if (timeoutId) window.clearTimeout(timeoutId);
			window.removeEventListener("resize", updateAnchor);
			window.removeEventListener("scroll", updateAnchor, true);
		};
	}, [isOpen, currentStep]);

	if (!isOpen || !currentStep) return null;

	const isFirst = currentStepIndex === 0;
	const isLast = currentStepIndex === steps.length - 1;

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

		if (!anchorRect) {
			return { left: "50%", top: 90, transform: "translateX(-50%)", width: popupWidth, maxWidth: "calc(100vw - 24px)" } as const;
		}

		const isDropdownItemStep =
			currentStep.highlightKey.startsWith("operations-") ||
			currentStep.highlightKey.startsWith("admin-");

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

	const cutoutStyle = (() => {
		if (!anchorRect) return null;
		const padding = 6;
		const left = Math.max(4, anchorRect.left - padding);
		const top = Math.max(4, anchorRect.top - padding);
		const width = anchorRect.width + padding * 2;
		const height = anchorRect.height + padding * 2;
		return {
			left,
			top,
			width,
			height
		} as const;
	})();

	return (
		<>
			{cutoutStyle ? (
				<div className="position-fixed tutorial-dim-cutout" style={cutoutStyle} />
			) : (
				<div className="position-fixed top-0 start-0 w-100 h-100 tutorial-dim-backdrop" />
			)}
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
		</>
	);
}

export default TutorialOverlay;


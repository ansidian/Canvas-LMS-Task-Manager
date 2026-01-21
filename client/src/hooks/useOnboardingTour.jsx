import { useMemo } from "react";

export default function useOnboardingTour({
	modKey,
	showOnboarding,
	onboardingStep,
	setOnboardingStep,
	completeOnboarding,
}) {
	const tourSteps = useMemo(
		() => [
			{
				id: "settings-button",
				title: "Configure Canvas",
				content: `First, open Settings (${modKey}+,) to enter your Canvas URL and API token. This is required to fetch your assignments. You can also manage and choose to disable certain classes here.`,
			},
			{
				id: "header-utilities",
				title: "Quick Actions",
				content: `Find assignments instantly (${modKey}+K), import them from Canvas (R), and toggle between light or dark mode (${modKey}+J).`,
			},
			{
				id: "pending-section",
				title: "Pending Items",
				content:
					"Review and approve Canvas assignments here before they appear on your calendar. Click on any item to customize it before adding.",
			},
			{
				id: "filter-section",
				title: "Filters",
				content:
					"Filter your calendar by class or completion status to focus on what matters most to you.",
			},
			{
				id: "demo-approval-modal",
				title: "Approve Items",
				content:
					"When you click any pending assignment, this modal opens. Review and adjust any details before adding to your calendar.",
				popoverProps: {
					position: "left",
					offset: { mainAxis: 16, crossAxis: 0 },
				},
			},
			{
				id: "demo-event-modal",
				title: "Edit Items",
				content:
					"Click any calendar event to bring up this modal. Edit details, status your progress, submit to Canvas, or add notes.",
				popoverProps: {
					position: "left",
					offset: { mainAxis: 16, crossAxis: 0 },
				},
			},
		],
		[modKey],
	);

	const showDemoApprovalModal = showOnboarding && onboardingStep === 4;
	const showDemoEventModal = showOnboarding && onboardingStep === 5;

	const handleTourComplete = () => {
		completeOnboarding();
	};

	const tourStepsWithTracking = useMemo(
		() =>
			tourSteps.map((step, index) => ({
				...step,
				content: (controller) => {
					if (controller?.state?.currentStep !== index) {
						setTimeout(() => {
							setOnboardingStep(index);
						}, 0);
					}
					return step.content;
				},
			})),
		[tourSteps, setOnboardingStep],
	);

	return {
		showDemoApprovalModal,
		showDemoEventModal,
		handleTourComplete,
		tourStepsWithTracking,
	};
}

import { DemoApprovalModal, DemoEventModal } from "../OnboardingDemoModals";
import { useAppControllerContext } from "../../contexts/AppControllerContext";

export default function AppOnboardingDemos() {
	const controller = useAppControllerContext();

	return (
		<>
			{controller.showDemoApprovalModal && (
				<DemoApprovalModal onClose={() => {}} />
			)}
			{controller.showDemoEventModal && (
				<DemoEventModal onClose={() => {}} />
			)}
		</>
	);
}

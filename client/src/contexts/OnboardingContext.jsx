import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { setStorageItem } from "../utils/storage";

const OnboardingContext = createContext(null);

const initialState = {
	showOnboarding: false,
	onboardingStep: 0,
};

function resolveNext(value, current) {
	return typeof value === "function" ? value(current) : value;
}

function onboardingReducer(state, action) {
	switch (action.type) {
		case "SET_SHOW_ONBOARDING":
			return {
				...state,
				showOnboarding: resolveNext(action.value, state.showOnboarding),
			};
		case "SET_ONBOARDING_STEP":
			return {
				...state,
				onboardingStep: resolveNext(
					action.value,
					state.onboardingStep,
				),
			};
		case "COMPLETE_ONBOARDING":
			return {
				...state,
				showOnboarding: false,
				onboardingStep: 0,
			};
		default:
			return state;
	}
}

export function OnboardingProvider({ children }) {
	const [state, dispatch] = useReducer(onboardingReducer, initialState);

	useEffect(() => {
		if (state.showOnboarding) {
			document.body.classList.add("onboarding-active");
		} else {
			document.body.classList.remove("onboarding-active");
		}
		return () => {
			document.body.classList.remove("onboarding-active");
		};
	}, [state.showOnboarding]);

	const value = useMemo(
		() => ({
			showOnboarding: state.showOnboarding,
			onboardingStep: state.onboardingStep,
			setShowOnboarding: (next) =>
				dispatch({ type: "SET_SHOW_ONBOARDING", value: next }),
			setOnboardingStep: (next) =>
				dispatch({ type: "SET_ONBOARDING_STEP", value: next }),
			completeOnboarding: () => {
				setStorageItem("hasCompletedOnboarding", "true");
				dispatch({ type: "COMPLETE_ONBOARDING" });
			},
		}),
		[state.onboardingStep, state.showOnboarding],
	);

	return (
		<OnboardingContext.Provider value={value}>
			{children}
		</OnboardingContext.Provider>
	);
}

export function useOnboarding() {
	const context = useContext(OnboardingContext);
	if (!context) {
		throw new Error("useOnboarding must be used within an OnboardingProvider");
	}
	return context;
}

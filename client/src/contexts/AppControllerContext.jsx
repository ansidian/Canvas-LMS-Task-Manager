import { createContext, useContext } from "react";

const AppControllerContext = createContext(null);

export function AppControllerProvider({ value, children }) {
	return (
		<AppControllerContext.Provider value={value}>
			{children}
		</AppControllerContext.Provider>
	);
}

export function useAppControllerContext() {
	const context = useContext(AppControllerContext);
	if (!context) {
		throw new Error(
			"useAppControllerContext must be used within an AppControllerProvider",
		);
	}
	return context;
}

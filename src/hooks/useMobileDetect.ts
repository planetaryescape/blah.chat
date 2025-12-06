import { useEffect, useState } from "react";

export function useMobileDetect() {
	const [state, setState] = useState({
		isMobile: false,
		isTouchDevice: false,
	});

	useEffect(() => {
		const checkMobile = () => {
			const mobile = window.matchMedia("(max-width: 768px)").matches;
			const touch = window.matchMedia("(pointer: coarse)").matches;
			setState({ isMobile: mobile, isTouchDevice: touch });
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	return state;
}

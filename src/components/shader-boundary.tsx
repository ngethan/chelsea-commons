import { Component } from "react";
import type { ReactNode } from "react";

/**
 * A shader crash (failed import, no WebGL context) must degrade to the plain
 * photograph, never take the page down. Shared by every paper-shaders surface.
 */
export class ShaderBoundary extends Component<
	{ fallback: ReactNode; children: ReactNode },
	{ failed: boolean }
> {
	state = { failed: false };

	static getDerivedStateFromError() {
		return { failed: true };
	}

	render() {
		return this.state.failed ? this.props.fallback : this.props.children;
	}
}

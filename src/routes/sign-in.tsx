import { ShaderPanel } from "@/components/auth/shader-panel";
import { GoogleMark } from "@/components/google-mark";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-field";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/toaster";
import { authClient } from "@/lib/auth-client";
import { NOT_INVITED } from "@/lib/auth-codes";
import { toast } from "@/lib/toast";
import { buildSeoTags } from "@/site-config";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

const searchSchema = z.object({
	error: z.string().optional(),
	next: z.string().optional(),
});

export const Route = createFileRoute("/sign-in")({
	validateSearch: searchSchema,
	head: () => ({
		...buildSeoTags({
			title: "Sign in | Chelsea Commons",
			description: "Sign in.",
			path: "/sign-in",
			robots: "noindex, nofollow",
		}),
		styles: [
			// The page is exactly the viewport with a full-bleed plate down one
			// side. The paper grain rides above everything at z-90, which over a
			// dithered photograph reads as a second, competing texture.
			{ children: "body::after{display:none}" },
		],
	}),
	component: SignIn,
});

/**
 * Where a rejected sign-in lands. Better Auth appends its code to the error
 * URL, so the only one worth naming is the one the roster produces.
 */
function messageFor(code: string): string {
	if (code === NOT_INVITED) {
		return "That account is not on the list.";
	}
	return "Could not sign you in. Try again.";
}

function SignIn() {
	const { error, next } = Route.useSearch();
	const navigate = useNavigate();
	const [pending, setPending] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	useEffect(() => {
		if (!error) return;
		toast.error(messageFor(error));
		// Clear it, so a refresh does not re-announce a failure from ten
		// minutes ago.
		navigate({ to: "/sign-in", search: { next }, replace: true });
	}, [error, next, navigate]);

	async function signInWithPassword(event: React.FormEvent) {
		event.preventDefault();
		setPending(true);
		const { error: failure } = await authClient.signIn.email({
			email,
			password,
		});
		if (failure) {
			// Deliberately one message for both "no such account" and "wrong
			// password": telling them apart is an account-enumeration oracle.
			toast.error(
				failure.status === 401 || failure.status === 403
					? "That email and password do not match an account."
					: (failure.message ?? "Could not sign you in."),
			);
			setPending(false);
			return;
		}
		await navigate({ to: next ?? "/admin/contacts" });
	}

	async function signInWithGoogle() {
		setPending(true);
		const { error: failure } = await authClient.signIn.social({
			provider: "google",
			callbackURL: next ?? "/admin/contacts",
			errorCallbackURL: "/sign-in",
		});
		if (failure) {
			toast.error(failure.message ?? "Could not sign you in.");
			setPending(false);
		}
	}

	// `h-dvh`, not the root layout's `--stable-vh`. That shim is measured once
	// and then re-measured only when the window's *width* changes, which is
	// correct for a long scrolling page (it stops mobile browser chrome
	// reflowing the content mid-scroll) and wrong for this one: resize the
	// height and the page keeps the stale value and comes up short of the
	// viewport. This page does not scroll, so the dynamic viewport unit is
	// both simpler and self-correcting.
	return (
		<>
			<div className="relative z-10 grid h-dvh grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
				<div className="flex min-h-0 flex-col overflow-y-auto px-6 py-8 sm:px-12">
					<Link
						to="/"
						className="self-start font-serif text-[13px] uppercase tracking-[0.22em] no-underline"
					>
						Chelsea Commons
					</Link>

					<div className="flex flex-1 items-center justify-center">
						<div className="w-full max-w-[440px] pb-10">
							<h1 className="font-serif text-[42px] leading-[1.05] tracking-[-0.015em]">
								Welcome back.
							</h1>
							<p className="mt-3 text-[14px] text-muted-foreground">
								Pick up the fleet where you left it.
							</p>

							<div className="mt-8 flex flex-col gap-4">
								<Button
									type="button"
									variant="outline"
									onClick={signInWithGoogle}
									disabled={pending}
									className="h-11 w-full"
								>
									<GoogleMark className="size-[18px] shrink-0" />
									Continue with Google
								</Button>

								<div className="flex items-center gap-3">
									<Separator className="flex-1" />
									<span className="text-[10.5px] uppercase tracking-[0.09em] text-muted-foreground">
										or
									</span>
									<Separator className="flex-1" />
								</div>

								<form
									onSubmit={signInWithPassword}
									className="flex flex-col gap-3"
								>
									<FloatingInput
										label="Email"
										type="email"
										name="email"
										autoComplete="email"
										required
										value={email}
										onChange={(e) => setEmail(e.target.value)}
									/>
									<FloatingInput
										label="Password"
										type="password"
										name="password"
										autoComplete="current-password"
										required
										value={password}
										onChange={(e) => setPassword(e.target.value)}
									/>
									<Button
										type="submit"
										disabled={pending}
										className="mt-1 h-11 w-full"
									>
										{pending ? "Signing in" : "Sign in"}
									</Button>
								</form>
							</div>
						</div>
					</div>
				</div>
				<div className="relative hidden h-full lg:block">
					<ArtworkPanel />
				</div>
			</div>
			{/* Outside the grid on purpose. Sonner renders a static <section>
			    wrapper, so as a child of the grid it became a second row and took
			    150px off the one the page actually lives in. Its own list is
			    position: fixed, so it does not care where it is mounted. */}
			<Toaster />
		</>
	);
}

/**
 * Berth's split keeps this column in the DOM and hides it with `hidden
 * lg:block`. That is `display: none`, which still mounts the component, so a
 * phone would stand up a WebGL context for a panel nobody sees. Rendering it
 * conditionally instead costs one media query. The state starts false so the
 * server's markup and the first client render agree.
 */
function ArtworkPanel() {
	const [wide, setWide] = useState(false);

	useEffect(() => {
		const query = window.matchMedia("(min-width: 1024px)");
		const sync = () => setWide(query.matches);
		sync();
		query.addEventListener("change", sync);
		return () => query.removeEventListener("change", sync);
	}, []);

	if (!wide) return null;

	return <ShaderPanel />;
}

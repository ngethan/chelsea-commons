/**
 * Whether a keystroke landed in prose somebody is writing.
 *
 * The admin's global shortcuts are bound on the window, so they also fire
 * while the post editor has focus, where the same chords mean something else:
 * cmd-B is bold before it is the sidebar, and cmd-K is a link before it is the
 * command palette. A shortcut that reaches past the text being typed is a
 * shortcut that eats the edit.
 *
 * Only contenteditable, deliberately. An ordinary input is not prose, and
 * cmd-K from a filter field should still open the palette.
 */
export function isEditingProse(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		target.closest('[contenteditable="true"]') !== null
	);
}

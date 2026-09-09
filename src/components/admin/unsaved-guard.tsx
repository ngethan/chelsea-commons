import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { useState } from "react";

/**
 * Closing a drawer with edits in it asks first.
 *
 * The drawer's `onOpenChange(false)` fires for the overlay, the X and
 * escape alike, so one hook covers all three: hand it `requestClose`
 * instead of the raw `onClose`, and mount `dialog` anywhere inside the
 * sheet. Nothing is discarded until the person says so.
 */
export function useUnsavedGuard(dirty: boolean, onClose: () => void) {
	const [confirming, setConfirming] = useState(false);

	const requestClose = () => {
		if (dirty) setConfirming(true);
		else onClose();
	};

	const dialog = (
		<ConfirmDialog
			open={confirming}
			onOpenChange={setConfirming}
			title="Discard changes?"
			description="What you typed here has not been saved."
			action="Discard"
			onConfirm={() => {
				setConfirming(false);
				onClose();
			}}
		/>
	);

	return { requestClose, dialog };
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { cancelCommunityEvent, restoreCommunityEvent, type EventStatusActionState } from "@/lib/actions/review-actions";

type EventStatusActionsProps = {
  event: {
    id: string;
    title: string | null;
    starts_at: string | null;
    event_status: string | null;
  };
};

const initialState: EventStatusActionState = { ok: false, message: null };

export function EventStatusActions({ event }: EventStatusActionsProps) {
  const cancelDialogRef = useRef<HTMLDialogElement>(null);
  const restoreDialogRef = useRef<HTMLDialogElement>(null);
  const [cancelNote, setCancelNote] = useState("");
  const [cancelState, cancelFormAction, isCancelling] = useActionState(cancelCommunityEvent, initialState);
  const [restoreState, restoreFormAction, isRestoring] = useActionState(restoreCommunityEvent, initialState);
  const isCancelled = event.event_status === "cancelled";

  useEffect(() => {
    if (!cancelState.ok) return;
    cancelDialogRef.current?.close();
  }, [cancelState.ok]);

  useEffect(() => {
    if (!restoreState.ok) return;
    restoreDialogRef.current?.close();
  }, [restoreState.ok]);

  return (
    <div className="event-actions">
      {isCancelled ? (
        <>
          <button className="button secondary" onClick={() => restoreDialogRef.current?.showModal()} type="button">
            Restore event
          </button>
          {restoreState.message ? <p className={restoreState.ok ? "action-success" : "action-error"}>{restoreState.message}</p> : null}
          <dialog className="dialog" ref={restoreDialogRef}>
            <form action={restoreFormAction} className="dialog-form">
              <input name="id" type="hidden" value={event.id} />
              <h2>Restore event</h2>
              <p className="muted">Restore this occurrence to Scheduled.</p>
              <dl className="dialog-details">
                <dt>Event</dt>
                <dd>{event.title ?? "Untitled event"}</dd>
                <dt>Date and time</dt>
                <dd>{formatDateTime(event.starts_at)}</dd>
              </dl>
              <div className="button-row">
                <button className="button" disabled={isRestoring} type="submit">
                  {isRestoring ? "Restoring..." : "Restore event"}
                </button>
                <button className="button secondary" onClick={() => restoreDialogRef.current?.close()} type="button">
                  Keep cancelled
                </button>
              </div>
              {restoreState.message && !restoreState.ok ? <p className="action-error">{restoreState.message}</p> : null}
            </form>
          </dialog>
        </>
      ) : (
        <>
          <button
            className="button danger"
            onClick={() => {
              setCancelNote("");
              cancelDialogRef.current?.showModal();
            }}
            type="button"
          >
            Cancel event
          </button>
          {cancelState.message ? <p className={cancelState.ok ? "action-success" : "action-error"}>{cancelState.message}</p> : null}
          <dialog className="dialog" ref={cancelDialogRef}>
            <form action={cancelFormAction} className="dialog-form">
              <input name="id" type="hidden" value={event.id} />
              <h2>Cancel event</h2>
              <p className="muted">This cancels one occurrence. It does not delete the event.</p>
              <dl className="dialog-details">
                <dt>Event</dt>
                <dd>{event.title ?? "Untitled event"}</dd>
                <dt>Date and time</dt>
                <dd>{formatDateTime(event.starts_at)}</dd>
              </dl>
              <label>Cancellation note</label>
              <textarea
                name="cancellation_note"
                onChange={(changeEvent) => setCancelNote(changeEvent.target.value)}
                required
                value={cancelNote}
              />
              <div className="button-row">
                <button className="button danger" disabled={isCancelling || cancelNote.trim().length === 0} type="submit">
                  {isCancelling ? "Cancelling..." : "Cancel event"}
                </button>
                <button className="button secondary" onClick={() => cancelDialogRef.current?.close()} type="button">
                  Keep scheduled
                </button>
              </div>
              {cancelState.message && !cancelState.ok ? <p className="action-error">{cancelState.message}</p> : null}
            </form>
          </dialog>
        </>
      )}
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

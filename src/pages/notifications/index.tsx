//
// The notifications page: banners at the top of a view and toasts that float over the page for
// a few seconds, in every kind: plain, info, success, warning and error. Built from MUI's Alert,
// Stack and Slide.
//

import { useEffect, useRef, useState, type ReactNode } from "react";
import Alert, { type AlertColor } from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Slide from "@mui/material/Slide";
import Stack from "@mui/material/Stack";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { Section } from "../../components/section";

//
// The kinds of message: plain, with no status, and the four statuses.
//
export type MessageKind = "plain" | AlertColor;

//
// One example message of each kind.
//
interface IExampleMessage {
    //
    // The kind of message.
    //
    kind: MessageKind;

    //
    // The name of the kind, as on its button.
    //
    label: string;

    //
    // The words of the message.
    //
    text: string;
}

//
// The example message of each kind, in the order they are shown.
//
const exampleMessages: IExampleMessage[] = [
    {
        kind: "plain",
        label: "Plain",
        text: "Fetched origin. Nothing new.",
    },
    {
        kind: "info",
        label: "Info",
        text: "A rebase is in progress.",
    },
    {
        kind: "success",
        label: "Success",
        text: "Pushed 2 commits to origin/main.",
    },
    {
        kind: "warning",
        label: "Warning",
        text: "main is 3 commits behind origin/main.",
    },
    {
        kind: "error",
        label: "Error",
        text: "Push rejected. Pull first, then push again.",
    },
];

//
// How long a toast stays before it closes itself, in milliseconds.
//
const TOAST_DURATION = 4000;

//
// Renders a close button for a message.
//
export function CloseButton({ onClick }: { onClick?: () => void }): ReactNode {
    return (
        <Tooltip title="Dismiss">
            <IconButton aria-label="Dismiss" size="small" onClick={onClick}>
                <FontAwesomeIcon icon={faXmark} />
            </IconButton>
        </Tooltip>
    );
}

//
// Renders a message of `kind`: a plain message with no icon and no status colour, or a message
// marked with its status colour and icon. With `onClose` it has a close button.
//
export function Message({ kind, children, onClose }: { kind: MessageKind; children: ReactNode; onClose?: () => void }): ReactNode {
    const action = onClose ? <CloseButton onClick={onClose} /> : undefined;
    if (kind === "plain") {
        return (
            <Alert variant="plain" icon={false} action={action}>
                {children}
            </Alert>
        );
    }
    return (
        <Alert severity={kind} action={action}>
            {children}
        </Alert>
    );
}

//
// Renders toasts stacked one above another with the overlay shadow, as they float over the page.
//
export function ToastStack({ children }: { children: ReactNode }): ReactNode {
    return (
        <Stack
            spacing={1}
            sx={{
                width: "360px",
                maxWidth: "100%",
                "& .MuiAlert-root": {
                    boxShadow: "var(--shadow-overlay)",
                },
            }}
        >
            {children}
        </Stack>
    );
}

//
// One toast on screen.
//
interface IToast {
    //
    // A number unique to the toast, for React's key and for closing it.
    //
    id: number;

    //
    // The message it shows.
    //
    message: IExampleMessage;
}

//
// Renders one toast that slides up into place and closes itself after TOAST_DURATION, or on
// Dismiss.
//
export function LiveToast({ toast, onClose }: { toast: IToast; onClose: (id: number) => void }): ReactNode {
    useEffect(() => {
        const timer = setTimeout(() => onClose(toast.id), TOAST_DURATION);
        return () => clearTimeout(timer);
    }, [toast.id, onClose]);

    return (
        <Slide direction="up" in appear>
            <div>
                <Message kind={toast.message.kind} onClose={() => onClose(toast.id)}>
                    {toast.message.text}
                </Message>
            </div>
        </Slide>
    );
}

//
// Renders a button for each kind of message. Each press adds a toast of that kind at the bottom
// left of the screen, under any toasts already there, so several stack up. The toasts mount
// inside the panel the buttons sit in, so they take the panel's theme.
//
export function ToastOpener(): ReactNode {
    const nextId = useRef(1);
    const [toasts, setToasts] = useState<IToast[]>([]);
    const close = useRef((id: number) => setToasts(current => current.filter(toast => toast.id !== id))).current;

    function show(message: IExampleMessage): void {
        const id = nextId.current;
        nextId.current = id + 1;
        setToasts(current => [...current, { id, message }]);
    }

    return (
        <div>
            <div className="flex flex-wrap" style={{ gap: "var(--space-2)" }}>
                {exampleMessages.map(message => (
                    <Button key={message.kind} variant="outlined" onClick={() => show(message)}>
                        {message.label}
                    </Button>
                ))}
            </div>
            <div
                aria-live="polite"
                style={{
                    position: "fixed",
                    left: "var(--space-4)",
                    right: "var(--space-4)",
                    bottom: "var(--space-4)",
                    zIndex: 1400,
                    pointerEvents: "none",
                }}
            >
                <ToastStack>
                    {toasts.map(toast => (
                        <div key={toast.id} style={{ pointerEvents: "auto" }}>
                            <LiveToast toast={toast} onClose={close} />
                        </div>
                    ))}
                </ToastStack>
            </div>
        </div>
    );
}

//
// Renders one section per kind of notification, each shown in the themes of the current mode.
//
export function NotificationsPage(): ReactNode {
    return (
        <div>
            <Section
                title="Banners"
                description="A message at the top of a view. Each status has its colour on the icon and on a bar down the left edge, and a plain message has neither. The words stay in the main text colour."
            >
                <div className="flex flex-col" style={{ gap: "var(--space-2)", maxWidth: "560px" }}>
                    {exampleMessages.map(message => (
                        <Message key={message.kind} kind={message.kind}>
                            {message.text}
                        </Message>
                    ))}
                </div>
            </Section>

            <Section title="Banner with a title and a close button" description="A longer message leads with a bold title. A message the person can put away has a Dismiss button.">
                <div className="flex flex-col" style={{ gap: "var(--space-2)", maxWidth: "560px" }}>
                    <Alert severity="error">
                        <AlertTitle>Push rejected</AlertTitle>
                        The remote has commits you do not have. Pull first, then push again.
                    </Alert>
                    <Message kind="warning" onClose={() => {}}>
                        main is 3 commits behind origin/main.
                    </Message>
                </div>
            </Section>

            <Section
                title="Stacked toasts"
                description="Toasts float over the page with the overlay shadow and a Dismiss button. When several arrive together they stack, newest at the bottom. Drawn here as they look on screen."
            >
                <ToastStack>
                    {exampleMessages.map(message => (
                        <Message key={message.kind} kind={message.kind} onClose={() => {}}>
                            {message.text}
                        </Message>
                    ))}
                </ToastStack>
            </Section>

            <Section
                title="Toasts on screen"
                description="Press a button to show a toast of that kind at the bottom left of the screen. Press several to stack them. Each closes after 4 seconds or on Dismiss."
            >
                <ToastOpener />
            </Section>
        </div>
    );
}

# Plan

Goal: A haiku helper: I type a topic and it writes a three-line haiku about it, and keeps the last ten haikus in a list.

1. The home page (app/page.tsx) shows a form with a labelled topic input and a 'Write haiku' button; typing a topic and submitting it (button click or Enter key) displays a three-line haiku about that topic on the page, with the topic shown as its heading. Submitting with an empty or whitespace-only topic shows a message asking for a topic and makes no call.
2. While the haiku is being written the page shows a 'Thinking…' message as text; if the model call fails, a message saying the assistant is unavailable appears where the haiku would be and the form stays usable for another try, and a failed call saves nothing to the list. The text 'Text you enter is sent to an AI model provider' appears beside the topic input.
3. Every successfully generated haiku is saved to the browser database with its topic and the time it was written; after reloading the page all saved haikus are still in the list.
4. The page lists the ten most recent haikus, newest first, each showing its topic, its three lines and the date it was written; saving an eleventh haiku drops the oldest one off the list.
5. Before any haiku exists the list area shows a 'No haikus yet' message instead of an empty list.
6. Each saved haiku has a 'Delete' button that removes it from the list immediately, and it is still gone after reloading the page.
7. Each haiku has a copy button that copies its three lines to the clipboard, confirmed by a toast, and a share button that shares or saves an image of the haiku, or copies a link where the device has no share sheet, with the outcome shown as text.
8. app/config.ts declares the app title, the page heading, the topic input's label, the accent colour and a haiku tone choice (classic, playful or melancholy) that is included in the request; opening the app with settings in its link shows the chosen title, heading, label, colour and tone instead of the defaults, they are still there after a reload, and the plain address still shows the defaults.
9. app/identity.ts names the app (for example 'Haiku Helper') with a description matching what it does, so the browser tab title and share preview reflect the finished app.
10. At phone width the form and the haiku list lay out in one readable column with every button at least 32px tall and wide.
11. With the network off, the home page still renders the saved haikus from storage, and trying to write a new one shows a message saying the internet is needed rather than a blank or a stuck spinner.

These are the outcomes this task is judged against.
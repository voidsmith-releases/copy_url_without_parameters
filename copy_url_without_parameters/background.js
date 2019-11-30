
{function()
{

    // -----------------------
    // Async functions
    // -----------------------

    // Source with slight modifications: https://github.com/mdn/webextensions-examples/tree/master/context-menu-copy-link-with-types
    async function clean_and_copy(par_url, par_tab)
    {

        // Remove parameters from URL
        const text = strip_parameters(par_url);

        // Always HTML-escape external input to avoid XSS.
        const safeUrl = escapeHTML(text);

        // The example will show how data can be copied, but since background
        // pages cannot directly write to the clipboard, we will run a content
        // script that copies the actual content.

        // clipboard-helper.js defines function copyToClipboard.
        const code = "copyToClipboard(" +
            JSON.stringify(safeUrl) + ");";

        // PERMISSION REQUEST: clipboardWrite
        browser.tabs.executeScript({
            code: "typeof copyToClipboard === 'function';",
        }).then((results) => {
            // The content script's last expression will be true if the function
            // has been defined. If this is not the case, then we need to run
            // clipboard-helper.js to define function copyToClipboard.
            if (!results || results[0] !== true) {
                return browser.tabs.executeScript(par_tab.id, {
                    file: "clipboard-helper.js",
                });
            }
        }).then(() => {
            return browser.tabs.executeScript(par_tab.id, {
                code,
            });
        }).catch((error) => {
            // This could happen if the extension is not allowed to run code in
            // the page, for example if the tab is a privileged page.
            console.error("Failed to copy text: " + error);
        });
    }


    async function get_tab()
    {
        // PERMISSION REQUEST: activeTab
        return browser.tabs.query({currentWindow: true, active: true})
                        .then((tabs)=>{
                            return tabs[0]
                        })
    }

    async function hotkey_grab_url()
    {
        let tab = await get_tab();
        clean_and_copy(tab.url, tab);
    }

    // ----------------------------
    // Standard functions
    // ----------------------------

    // https://gist.github.com/Rob--W/ec23b9d6db9e56b7e4563f1544e0d546
    function escapeHTML(str) {
        // Note: string cast using String; may throw if `str` is non-serializable, e.g. a Symbol.
        // Most often this is not the case though.
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;")
            .replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function strip_parameters(par_url)
    {
        return par_url.replace(/^([^\?]+)(?:\?.*)?/, "$1").replace(/^(?=([^\?]+\/)[^\-\._~—]+)/, "")

    }


    // --------------------------------
    // Context Menu entries
    // --------------------------------

    // PERMISSION REQUEST: contextMenus
    browser.contextMenus.create({
        id: "strip_url_parameters_link",
        title: "Copy URL w/o Parameters",
        contexts: ["link"]
    });

    // PERMISSION REQUEST: contextMenus
    browser.contextMenus.create({
        id: "strip_url_parameters_selected",
        title: "Copy URL w/o Parameters",
        contexts: ["selection"]
    });


    // --------------------------
    // Event Listeners
    // --------------------------

    browser.commands.onCommand.addListener((command) => {
        // User presses hotkey combo to pull url from current tab
        hotkey_grab_url();
    });


    browser.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === "strip_url_parameters_selected")
        {
            clean_and_copy(info.selectionText, tab);
        }
        else if (info.menuItemId === "strip_url_parameters_link") 
        {

            clean_and_copy(info.linkUrl, tab);
        }
    });

}}
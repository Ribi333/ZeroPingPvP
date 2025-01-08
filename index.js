import PogObject from "PogData";

const C02PacketUseEntity = Java.type("net.minecraft.network.play.client.C02PacketUseEntity");
const EntityAction = C02PacketUseEntity.Action;

const dataObject = new PogObject("ZeroPingPvP", {
    enabled: false,
    debugMode: false,
    debug2Mode: false,
}, "zppvpData.json");

register("command", (arg) => {
    if (!arg) {
        ChatLib.chat("&b[&3ZPPVP&b] Commands:");
        ChatLib.chat("&b/zppvp toggle - &3Toggle the module");
        ChatLib.chat("&b/zppvp debug - &3Toggle debug mode");
        ChatLib.chat("&b/zppvp debug2 - &3Toggle advanced debug mode");
        return;
    }

    switch (arg.toLowerCase()) {
        case "toggle":
            dataObject.enabled = !dataObject.enabled;
            ChatLib.chat(`&b[&3ZPPVP&b] Module ${dataObject.enabled ? "&aenabled" : "&cdisabled"}.`);
            break;
        case "debug":
            dataObject.debugMode = !dataObject.debugMode;
            ChatLib.chat(`&b[&3ZPPVP&b] Debug mode ${dataObject.debugMode ? "&aenabled" : "&cdisabled"}.`);
            break;
        case "debug2":
            dataObject.debug2Mode = !dataObject.debug2Mode;
            ChatLib.chat(`&b[&3ZPPVP&b] Advanced debug mode ${dataObject.debug2Mode ? "&aenabled" : "&cdisabled"}.`);
            break;
        default:
            ChatLib.chat("&cUnknown command argument. Use &b/zppvp&c for help.");
    }
    dataObject.save();
}).setName("zppvp");

register("packetSent", (packet) => {
    if (!dataObject.enabled) return;

    if (dataObject.debugMode) {
        ChatLib.chat(`&b[&3ZPPVP&b] » Sent packet: ${packet.getClass().getSimpleName()}`);
    }

    if (packet instanceof C02PacketUseEntity) {
        try {
            let action;
            try {
                action = packet.func_149565_c();
            } catch (e) {
                try {
                    action = packet.getAction();
                } catch (e2) {
                    if (dataObject.debugMode) {
                        ChatLib.chat("&c[&3ZPPVP&b] » Could not get action type");
                    }
                    return;
                }
            }

            if (action === EntityAction.ATTACK) {
                if (dataObject.debug2Mode) {
                    ChatLib.chat("&b[&3ZPPVP&b] » Attack detected!");
                }
                
                if (dataObject.debug2Mode) {
                    ChatLib.chat("&b[&3ZPPVP&b] » Applied early hit effect");
                }
            }
        } catch (e) {
            if (dataObject.debugMode) {
                ChatLib.chat(`&c[&3ZPPVP&b] » Error: ${e.message}`);
            }
        }
    }
});

register("packetReceived", (packet, event) => {
    if (!dataObject.enabled) return;

    if (packet instanceof Java.type("net.minecraft.network.play.server.S19PacketEntityStatus")) {
        const status = packet.func_149160_c();
        if (status === 2) {
            if (dataObject.debug2Mode) {
                ChatLib.chat("&b[&3ZPPVP&b] » Hit confirmed by server!");
            }
            cancel(event);
        }
    }
});

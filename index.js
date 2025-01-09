import PogObject from "PogData";
const C02PacketUseEntity = Java.type("net.minecraft.network.play.client.C02PacketUseEntity");
const Action = C02PacketUseEntity.Action;

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

    if (arg === "toggle") {
        dataObject.enabled = !dataObject.enabled;
        dataObject.save();
        ChatLib.chat(`&b[&3ZPPVP&b] Module ${dataObject.enabled ? "&aenabled" : "&cdisabled"}.`);
    } else if (arg === "debug") {
        dataObject.debugMode = !dataObject.debugMode;
        dataObject.save();
        ChatLib.chat(`&b[&3ZPPVP&b] Debug mode ${dataObject.debugMode ? "&aenabled" : "&cdisabled"}.`);
    } else if (arg === "debug2") {
        dataObject.debug2Mode = !dataObject.debug2Mode;
        dataObject.save();
        ChatLib.chat(`&b[&3ZPPVP&b] Advanced debug mode ${dataObject.debug2Mode ? "&aenabled" : "&cdisabled"}.`);
    } else {
        ChatLib.chat("&cUnknown command argument. Use &b/zppvp&c for help.");
    }
}).setName("zppvp");

const simulateHit = (target) => {
    if (!target) return;

    target.attack();

    if (dataObject.debug2Mode) {
        ChatLib.chat(`&b[&3ZPPVP&b] » Hit has been simulated!`);
    }
};

register("packetSent", (packet) => {
    if (!dataObject.enabled) return;

    if (dataObject.debugMode) {
        ChatLib.chat(`&b[&3DEBUG&b] Outgoing packet: ${packet.getClass().getName()}`);
    }

    if (packet instanceof C02PacketUseEntity) {
        let target;
        try {
            target = packet.func_149564_a();
        } catch (e) {
            ChatLib.chat("&c[Error] Unable to fetch target entity. Adjust method name.");
            return;
        }

        const action = packet.func_149565_c();

        if (action === Action.ATTACK) {
            if (dataObject.debug2Mode) {
                ChatLib.chat(`&b[&3ZPPVP&b] » Attack packet received!`);
            }

            simulateHit(target);
        }
    }
});

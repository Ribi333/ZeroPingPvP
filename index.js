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

const isValidTarget = (target) => {
    if (!target) return false;
    if (!target.getEntity) return false;
    if (target.getEntity() === Player.getPlayer()) return false;
    return true;
};

const simulateHit = (target) => {
    if (!isValidTarget(target)) return;
    
    try {
        // Get player's attack reach (usually 3-4 blocks)
        const reach = Player.getReachDistance() || 3;
        
        // Check if target is within reach
        if (target.distanceTo(Player) <= reach) {
            // Perform the attack sequence
            Player.getPlayer().swingItem();
            Client.sendPacket(new C02PacketUseEntity(target.getEntity(), EntityAction.ATTACK));
            
            if (dataObject.debug2Mode) {
                ChatLib.chat(`&b[&3ZPPVP&b] » Hit simulated! Distance: ${target.distanceTo(Player).toFixed(2)}`);
            }
        } else if (dataObject.debug2Mode) {
            ChatLib.chat(`&b[&3ZPPVP&b] » Target out of reach: ${target.distanceTo(Player).toFixed(2)} blocks`);
        }
    } catch (e) {
        if (dataObject.debugMode) {
            ChatLib.chat(`&c[Error] Failed to simulate hit: ${e.message}`);
        }
    }
};

register("packetSent", (packet) => {
    if (!dataObject.enabled) return;

    if (dataObject.debugMode) {
        ChatLib.chat(`&b[&3DEBUG&b] Packet: ${packet.getClass().getName()}`);
    }

    if (packet instanceof C02PacketUseEntity) {
        let target;
        
        try {
            target = packet.getEntityFromWorld(World.getWorld());
            
            if (!target) {
                if (dataObject.debugMode) {
                    ChatLib.chat("&c[Debug] No target entity found");
                }
                return;
            }

            let action;
            try {
                action = packet.getAction();
            } catch (e) {
                action = packet.func_149565_c();
            }

            if (action === EntityAction.ATTACK) {
                if (dataObject.debug2Mode) {
                    ChatLib.chat(`&b[&3ZPPVP&b] » Attack packet detected!`);
                }
                
                Client.schedule(1, () => {
                    simulateHit(target);
                });
            }
        } catch (e) {
            if (dataObject.debugMode) {
                ChatLib.chat(`&c[Error] Packet handling failed: ${e.message}`);
            }
        }
    }
});

register("worldLoad", () => {
    dataObject.save();
});

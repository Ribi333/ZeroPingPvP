import PogObject from "PogData";

const C02PacketUseEntity = Java.type("net.minecraft.network.play.client.C02PacketUseEntity");
const C0APacketAnimation = Java.type("net.minecraft.network.play.client.C0APacketAnimation");
const EntityAction = C02PacketUseEntity.Action;

const dataObject = new PogObject("ZeroPingPvP", {
    enabled: false,
    debugMode: false,
    debug2Mode: false,
}, "zppvpData.json");

const MAX_ATTACK_DISTANCE = 3.00;
const ATTACK_COOLDOWN = 0;
let lastAttackTime = 0;

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

const isValidTarget = (entity, playerName) => {
    if (!entity) {
        if (dataObject.debug2Mode) ChatLib.chat("&c[&3ZPPVP&b] » Invalid target: null");
        return false;
    }
    if (entity.getName() === playerName) {
        if (dataObject.debug2Mode) ChatLib.chat("&c[&3ZPPVP&b] » Invalid target: self");
        return false;
    }
    return true;
};

const findClosestTarget = (maxDistance = 4) => {
    const player = Player.getPlayer();
    const playerName = Player.getName();
    
    return World.getAllEntitiesOfType(Java.type("net.minecraft.entity.player.EntityPlayer"))
        .filter(entity => entity.getName() !== playerName)
        .sort((a, b) => a.distanceTo(player) - b.distanceTo(player))
        .find(entity => entity.distanceTo(player) <= maxDistance);
};

const canAttack = (target) => {
    if (!target) return false;
    
    const currentTime = Date.now();
    const distance = Player.getPlayer().distanceTo(target);
    const cooldownElapsed = currentTime - lastAttackTime >= ATTACK_COOLDOWN;
    
    if (dataObject.debug2Mode) {
        ChatLib.chat(`&b[&3ZPPVP&b] » Distance to target: ${distance}`);
        ChatLib.chat(`&b[&3ZPPVP&b] » Time since last attack: ${currentTime - lastAttackTime}ms`);
    }
    
    return distance <= MAX_ATTACK_DISTANCE && cooldownElapsed;
};

const simulateHit = (target, playerName) => {
    if (!isValidTarget(target, playerName)) return;
    if (!canAttack(target)) return;

    if (dataObject.debug2Mode) {
        ChatLib.chat(`&b[&3ZPPVP&b] » Simulating hit on: ${target.getName()}`);
    }

    Client.sendPacket(new C0APacketAnimation());

    Client.sendPacket(new C02PacketUseEntity(target.getEntity(), EntityAction.ATTACK));

    Player.getPlayer().field_70737_aN = 3;
    
    lastAttackTime = Date.now();
    
    if (dataObject.debug2Mode) {
        ChatLib.chat("&b[&3ZPPVP&b] » Hit simulated!");
    }
};

register("packetSent", (packet) => {
    if (!dataObject.enabled) return;

    if (packet instanceof C02PacketUseEntity) {
        if (dataObject.debug2Mode) {
            ChatLib.chat("&b[&3ZPPVP&b] » C02PacketUseEntity detected!");
        }

        try {
            let action;
            try {
                action = packet.func_149565_c();
            } catch (e) {
                if (dataObject.debug2Mode) {
                    ChatLib.chat("&c[&3ZPPVP&b] » Could not get action type");
                }
                return;
            }

            if (action === EntityAction.ATTACK) {
                const playerName = Player.getName();
                const target = findClosestTarget();

                if (target) {
                    simulateHit(target, playerName);
                } else if (dataObject.debug2Mode) {
                    ChatLib.chat("&c[&3ZPPVP&b] » Could not find target entity");
                }
            }
        } catch (e) {
            if (dataObject.debug2Mode) {
                ChatLib.chat(`&c[&3ZPPVP&b] » Error: ${e.message}`);
            }
        }
    }
});

register("packetReceived", (packet) => {
    if (!dataObject.enabled) return;

    if (packet instanceof Java.type("net.minecraft.network.play.server.S19PacketEntityStatus")) {
        const status = packet.func_149160_c();
        if (status === 2) { // animation status
            if (dataObject.debug2Mode) {
                ChatLib.chat("&b[&3ZPPVP&b] » Hit confirmed by server!");
            }
        }
    }
});

register("worldLoad", () => {
    dataObject.save();
});

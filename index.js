import PogObject from "PogData";

const C02PacketUseEntity = Java.type("net.minecraft.network.play.client.C02PacketUseEntity");
const C0APacketAnimation = Java.type("net.minecraft.network.play.client.C0APacketAnimation");
const EntityAction = C02PacketUseEntity.Action;
const S19PacketEntityStatus = Java.type("net.minecraft.network.play.server.S19PacketEntityStatus");
const S0BPacketAnimation = Java.type("net.minecraft.network.play.server.S0BPacketAnimation");

const dataObject = new PogObject("ZeroPingPvP", {
    enabled: false,
    debugMode: false,
    debug2Mode: false,
    highPingMode: true,
    attackTimeout: 250,
    firstAttackDelay: 175,
    renderEffects: true,
    disableInGUI: true,
}, "zppvpData.json");

let lastTargetId = -1;
let pendingAttacks = new Set();
let attackQueue = [];
let attacking = false;
let targetAcquiredAt = 0;
let inGUI = false;

register("command", (arg1, arg2) => {
    if (!arg1) {
        ChatLib.chat("&b[&3ZPPVP&b] Commands:");
        ChatLib.chat("&b/zppvp toggle - &3Toggle the module");
        ChatLib.chat("&b/zppvp debug - &3Toggle debug mode");
        ChatLib.chat("&b/zppvp debug2 - &3Toggle advanced debug mode");
        ChatLib.chat("&b/zppvp highping - &3Toggle high-ping mode");
        ChatLib.chat("&b/zppvp effects - &3Toggle hit effects");
        ChatLib.chat("&b/zppvp gui - &3Toggle disable in GUI");
        ChatLib.chat("&b/zppvp firstdelay <ms> - &3Set first attack delay");
        ChatLib.chat("&b/zppvp timeout <ms> - &3Set attack timeout");
        ChatLib.chat("&b/zppvp status - &3Show current status");
        ChatLib.chat("&b/zppvp recommend - &3Set recommended settings");
        return;
    }

    switch (arg1.toLowerCase()) {
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
        case "highping":
            dataObject.highPingMode = !dataObject.highPingMode;
            ChatLib.chat(`&b[&3ZPPVP&b] High-ping mode ${dataObject.highPingMode ? "&aenabled" : "&cdisabled"}.`);
            break;
        case "effects":
            dataObject.renderEffects = !dataObject.renderEffects;
            ChatLib.chat(`&b[&3ZPPVP&b] Hit effects ${dataObject.renderEffects ? "&aenabled" : "&cdisabled"}.`);
            break;
        case "gui":
            dataObject.disableInGUI = !dataObject.disableInGUI;
            ChatLib.chat(`&b[&3ZPPVP&b] Disable in GUI ${dataObject.disableInGUI ? "&aenabled" : "&cdisabled"}.`);
            break;
        case "timeout":
            if (!arg2) {
                ChatLib.chat(`&b[&3ZPPVP&b] Current attack timeout: &e${dataObject.attackTimeout}ms`);
                return;
            }
            const timeout = parseInt(arg2);
            if (isNaN(timeout) || timeout < 0) {
                ChatLib.chat("&c[&3ZPPVP&b] Invalid timeout! Must be a non-negative number.");
                return;
            }
            dataObject.attackTimeout = timeout;
            ChatLib.chat(`&b[&3ZPPVP&b] Attack timeout set to &e${timeout}ms`);
            break;
        case "firstdelay":
            if (!arg2) {
                ChatLib.chat(`&b[&3ZPPVP&b] Current first attack delay: &e${dataObject.firstAttackDelay}ms`);
                return;
            }
            const delay = parseInt(arg2);
            if (isNaN(delay) || delay < 0) {
                ChatLib.chat("&c[&3ZPPVP&b] Invalid delay! Must be a non-negative number.");
                return;
            }
            dataObject.firstAttackDelay = delay;
            ChatLib.chat(`&b[&3ZPPVP&b] First attack delay set to &e${delay}ms`);
            break;
        case "recommend":
            dataObject.attackTimeout = 40;
            dataObject.firstAttackDelay = 175;
            dataObject.highPingMode = true;
            dataObject.renderEffects = true;
            dataObject.disableInGUI = true;
            dataObject.debugMode = false;
            dataObject.debug2Mode = false;
            ChatLib.chat("&b[&3ZPPVP&b] Applied recommended settings:");
            ChatLib.chat("&b  • Attack Timeout: &e40ms");
            ChatLib.chat("&b  • First Attack Delay: &e175ms");
            ChatLib.chat("&b  • High-ping Mode: &aEnabled");
            ChatLib.chat("&b  • Hit Effects: &aEnabled");
            ChatLib.chat("&b  • Disable in GUI: &aEnabled");
            break;
        case "status":
            ChatLib.chat("&b[&3ZPPVP&b] Status:");
            ChatLib.chat(`&b Module: ${dataObject.enabled ? "&aEnabled" : "&cDisabled"}`);
            ChatLib.chat(`&b Debug: ${dataObject.debugMode ? "&aEnabled" : "&cDisabled"}`);
            ChatLib.chat(`&b Advanced Debug: ${dataObject.debug2Mode ? "&aEnabled" : "&cDisabled"}`);
            ChatLib.chat(`&b High-ping Mode: ${dataObject.highPingMode ? "&aEnabled" : "&cDisabled"}`);
            ChatLib.chat(`&b Hit Effects: ${dataObject.renderEffects ? "&aEnabled" : "&cDisabled"}`);
            ChatLib.chat(`&b Disable in GUI: ${dataObject.disableInGUI ? "&aEnabled" : "&cDisabled"}`);
            ChatLib.chat(`&b Attack Timeout: &e${dataObject.attackTimeout}ms`);
            ChatLib.chat(`&b First Attack Delay: &e${dataObject.firstAttackDelay}ms`);
            break;
        default:
            ChatLib.chat("&cUnknown command argument. Use &b/zppvp&c for help.");
    }
    dataObject.save();
}).setName("zppvp");

register("guiOpened", (gui) => {
    inGUI = true;
    if (dataObject.debug2Mode) {
        ChatLib.chat("&b[&3ZPPVP&b] » GUI opened, module paused");
    }
});

register("guiClosed", (gui) => {
    inGUI = false;
    if (dataObject.debug2Mode) {
        ChatLib.chat("&b[&3ZPPVP&b] » GUI closed, module resumed");
    }
});

function findTargetEntity() {
    try {
        const entities = World.getAllEntitiesOfType(Java.type("net.minecraft.entity.player.EntityPlayer"));
        const player = Player.getPlayer();
        const playerName = Player.getName();
        
        const targets = entities.filter(entity => entity.getName() !== playerName)
            .filter(entity => entity.distanceTo(player) <= 4)
            .sort((a, b) => a.distanceTo(player) - b.distanceTo(player));
            
        if (targets.length > 0) {
            return targets[0];
        }
        
        if (dataObject.debug2Mode) {
            ChatLib.chat("&c[&3ZPPVP&b] » No valid targets found within range");
        }
        return null;
    } catch (e) {
        if (dataObject.debug2Mode) {
            ChatLib.chat(`&c[&3ZPPVP&b] » Error finding target: ${e.message}`);
        }
        return null;
    }
}

register("clicked", (mouseX, mouseY, button, isPressed, event) => {
    if (!dataObject.enabled) return;
    
    if (dataObject.disableInGUI && inGUI) return;
    
    if (button !== 0 || !isPressed) return;
    
    const target = findTargetEntity();
    
    if (!target) return;
    
    cancel(event);
    
    if (dataObject.debug2Mode) {
        ChatLib.chat("&b[&3ZPPVP&b] » Left click detected!");
    }

    try {
        const entityId = target.getName();
        
        if (lastTargetId !== entityId) {
            lastTargetId = entityId;
            targetAcquiredAt = Date.now();
            
            if (dataObject.debug2Mode) {
                ChatLib.chat(`&b[&3ZPPVP&b] » New target acquired: ${entityId}`);
            }
        }
        
        if (targetAcquiredAt + dataObject.firstAttackDelay > Date.now()) {
            if (dataObject.debug2Mode) {
                ChatLib.chat(`&b[&3ZPPVP&b] » First attack delay, waiting...`);
            }
            return;
        }
        
        if (dataObject.debug2Mode) {
            ChatLib.chat(`&b[&3ZPPVP&b] » Target found: ${entityId}`);
        }
        
        if (dataObject.highPingMode || !attacking) {
            if (dataObject.renderEffects) {
                Player.getPlayer().field_70737_aN = 3;
                
                if (dataObject.debug2Mode) {
                    ChatLib.chat("&b[&3ZPPVP&b] » Hit effects applied early!");
                }
            }
            
            pendingAttacks.add(entityId);
        }
        
        if (dataObject.highPingMode && attacking) {
            attackQueue.push(entityId);
            
            if (dataObject.debug2Mode) {
                ChatLib.chat(`&b[&3ZPPVP&b] » Queued attack on entity ${entityId}`);
            }
        } else {
            sendAttack(target);
        }
    } catch (e) {
        if (dataObject.debug2Mode) {
            ChatLib.chat(`&c[&3ZPPVP&b] » Error: ${e.message}`);
        }
    }
});

function sendAttack(target) {
    if (!target) return;
    
    try {
        attacking = true;
        
        Client.sendPacket(new C0APacketAnimation());
        
        Client.sendPacket(new C02PacketUseEntity(target.getEntity(), EntityAction.ATTACK));
        
        if (dataObject.debug2Mode) {
            ChatLib.chat(`&b[&3ZPPVP&b] » Attack sent to ${target.getName()}`);
        }
        
        const initialTargetId = lastTargetId;
        setTimeout(() => {
            if (lastTargetId !== initialTargetId) return;
            
            attacking = false;
            attackQueue = [];
            
            if (dataObject.debug2Mode && dataObject.attackTimeout > 0) {
                ChatLib.chat("&b[&3ZPPVP&b] » Attack timeout reached, reset state");
            }
        }, dataObject.attackTimeout);
    } catch (e) {
        attacking = false;
        if (dataObject.debug2Mode) {
            ChatLib.chat(`&c[&3ZPPVP&b] » Error sending attack: ${e.message}`);
        }
    }
}

function processQueue() {
    if (attackQueue.length === 0) return;
    
    const nextEntityId = attackQueue.shift();
    
    const entities = World.getAllEntities();
    const target = entities.find(entity => entity.getName && entity.getName() === nextEntityId);
    
    if (target) {
        sendAttack(target);
    } else if (dataObject.debug2Mode) {
        ChatLib.chat(`&c[&3ZPPVP&b] » Queued entity ${nextEntityId} no longer found`);
    }
}

register("packetReceived", (packet, event) => {
    if (!dataObject.enabled) return;
    
    if (dataObject.disableInGUI && inGUI) return;

    if (dataObject.debugMode) {
        ChatLib.chat(`&b[&3DEBUG&b] Received packet: ${packet.getClass().getSimpleName()}`);
    }

    if (packet instanceof S19PacketEntityStatus) {
        const status = packet.func_149160_c();
        if (status === 2) { // hurt animation status
            try {
                const entityObj = packet.func_149161_a();
                
                if (!entityObj) return;
                
                const entity = new Entity(entityObj);
                const entityId = entity.getName();
                
                if (entityId && pendingAttacks.has(entityId)) {
                    if (dataObject.debug2Mode) {
                        ChatLib.chat(`&b[&3ZPPVP&b] » Cancelled server hit animation for entity ${entityId}`);
                    }
                    pendingAttacks.delete(entityId);
                    
                    if (dataObject.highPingMode) {
                        processQueue();
                    }
                    
                    if (dataObject.renderEffects) {
                        cancel(event);
                    }
                }
            } catch (e) {
                if (dataObject.debug2Mode) {
                    ChatLib.chat(`&c[&3ZPPVP&b] » Error processing damage animation: ${e.message}`);
                }
            }
        }
    }
    
    if (packet instanceof S0BPacketAnimation) {
        try {
            const entityId = packet.func_148978_c();
            const animationType = packet.func_148977_d();
            
            const playerId = Player.getPlayer().getEntityId();
            
            if (entityId === playerId && animationType === 0) {
                if (dataObject.debug2Mode) {
                    ChatLib.chat("&b[&3ZPPVP&b] » Cancelled server arm swing animation");
                }
                cancel(event);
            }
        } catch (e) {
            if (dataObject.debug2Mode) {
                ChatLib.chat(`&c[&3ZPPVP&b] » Error processing arm animation: ${e.message}`);
            }
        }
    }
});

register("packetSent", (packet) => {
    if (!dataObject.enabled) return;
    
    if (dataObject.disableInGUI && inGUI) return;

    if (dataObject.debugMode) {
        ChatLib.chat(`&b[&3DEBUG&b] Sent packet: ${packet.getClass().getSimpleName()}`);
    }

    if (packet instanceof C02PacketUseEntity) {
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

            if (action === EntityAction.ATTACK && dataObject.debug2Mode) {
                ChatLib.chat("&b[&3ZPPVP&b] » Attack packet sent!");
            }
        } catch (e) {
            if (dataObject.debug2Mode) {
                ChatLib.chat(`&c[&3ZPPVP&b] » Error: ${e.message}`);
            }
        }
    }
});

register("worldLoad", () => {
    dataObject.save();
    pendingAttacks.clear();
    attackQueue = [];
    attacking = false;
    lastTargetId = -1;
    inGUI = false;
});

ChatLib.chat("&b[&3ZPPVP&b] Module loaded! Use &b/zppvp toggle&3 to enable.");
ChatLib.chat("&b[&3ZPPVP&b] Use &b/zppvp recommend&3 for optimal settings.");

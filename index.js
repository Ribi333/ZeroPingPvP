import PogObject from "PogData";

// Import necessary Java classes
const C02PacketUseEntity = Java.type("net.minecraft.network.play.client.C02PacketUseEntity");
const C0APacketAnimation = Java.type("net.minecraft.network.play.client.C0APacketAnimation");
const EntityAction = C02PacketUseEntity.Action;
const S19PacketEntityStatus = Java.type("net.minecraft.network.play.server.S19PacketEntityStatus");
const S0BPacketAnimation = Java.type("net.minecraft.network.play.server.S0BPacketAnimation");

// Initialize data storage
const dataObject = new PogObject("ZeroPingPvP", {
    enabled: false,
    debugMode: false,
    debug2Mode: false,
    highPingMode: true,     // Queue mode for high-ping environments
    attackTimeout: 250,     // Default timeout: 250ms
    firstAttackDelay: 175,  // Default first attack delay: 175ms
    renderEffects: true,    // Show hit effects client-side
    disableInGUI: true,     // Disable module when in GUI
}, "zppvpData.json");

// State tracking
let lastTargetId = -1;
let pendingAttacks = new Set();  // Track entity IDs we've attacked
let attackQueue = [];           // Queue for high-ping mode
let attacking = false;          // Track if we're in an attack sequence
let targetAcquiredAt = 0;       // When we first identified a target
let inGUI = false;              // Track if in GUI

// Register the command and its subcommands
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
            // Lower values for better performance
            dataObject.attackTimeout = 150;
            dataObject.firstAttackDelay = 0;
            dataObject.highPingMode = true;
            dataObject.renderEffects = true;
            dataObject.disableInGUI = true;
            ChatLib.chat("&b[&3ZPPVP&b] Applied recommended settings:");
            ChatLib.chat("&b  • Attack Timeout: &e150ms");
            ChatLib.chat("&b  • First Attack Delay: &e0ms");
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

// Track GUI open/close
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

// Find the closest entity in the player's line of sight
function findTargetEntity() {
    try {
        // Get all player entities
        const entities = World.getAllEntitiesOfType(Java.type("net.minecraft.entity.player.EntityPlayer"));
        const player = Player.getPlayer();
        const playerName = Player.getName();
        
        // Filter out self and sort by distance
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

// Process clicks to send attack packets
register("clicked", (mouseX, mouseY, button, isPressed, event) => {
    if (!dataObject.enabled) return;
    
    // Check if in GUI and module should be disabled
    if (dataObject.disableInGUI && inGUI) return;
    
    // Only process left clicks when pressed
    if (button !== 0 || !isPressed) return;
    
    // Find the closest valid target
    const target = findTargetEntity();
    
    // If no target found, allow normal clicking
    if (!target) return;
    
    // At this point we know we're in combat - CANCEL VANILLA CLICK
    cancel(event);
    
    if (dataObject.debug2Mode) {
        ChatLib.chat("&b[&3ZPPVP&b] » Left click detected!");
    }

    try {
        // Get the target's name for tracking
        const entityId = target.getName();
        
        // Check if this is a new target
        if (lastTargetId !== entityId) {
            lastTargetId = entityId;
            targetAcquiredAt = Date.now();
            
            if (dataObject.debug2Mode) {
                ChatLib.chat(`&b[&3ZPPVP&b] » New target acquired: ${entityId}`);
            }
        }
        
        // Check for first attack delay - don't send anything during this delay
        if (targetAcquiredAt + dataObject.firstAttackDelay > Date.now()) {
            if (dataObject.debug2Mode) {
                ChatLib.chat(`&b[&3ZPPVP&b] » First attack delay, waiting...`);
            }
            return;
        }
        
        if (dataObject.debug2Mode) {
            ChatLib.chat(`&b[&3ZPPVP&b] » Target found: ${entityId}`);
        }
        
        // Handle high-ping mode
        if (dataObject.highPingMode || !attacking) {
            // Always apply predictive effects
            if (dataObject.renderEffects) {
                // Apply hit effect client-side
                Player.getPlayer().field_70737_aN = 3;
                
                if (dataObject.debug2Mode) {
                    ChatLib.chat("&b[&3ZPPVP&b] » Hit effects applied early!");
                }
            }
            
            // Track this entity as pending
            pendingAttacks.add(entityId);
        }
        
        if (dataObject.highPingMode && attacking) {
            // Queue the attack for later
            attackQueue.push(entityId);
            
            if (dataObject.debug2Mode) {
                ChatLib.chat(`&b[&3ZPPVP&b] » Queued attack on entity ${entityId}`);
            }
        } else {
            // Process the attack immediately
            sendAttack(target);
        }
    } catch (e) {
        if (dataObject.debug2Mode) {
            ChatLib.chat(`&c[&3ZPPVP&b] » Error: ${e.message}`);
        }
    }
});

// Function to send attack packets
function sendAttack(target) {
    if (!target) return;
    
    try {
        attacking = true;
        
        // 1. Send arm swing animation packet
        Client.sendPacket(new C0APacketAnimation());
        
        // 2. Send attack packet
        Client.sendPacket(new C02PacketUseEntity(target.getEntity(), EntityAction.ATTACK));
        
        if (dataObject.debug2Mode) {
            ChatLib.chat(`&b[&3ZPPVP&b] » Attack sent to ${target.getName()}`);
        }
        
        // Set timeout to reset attack state
        const initialTargetId = lastTargetId;
        setTimeout(() => {
            if (lastTargetId !== initialTargetId) return;
            
            // Reset state
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

// Process attack queue
function processQueue() {
    if (attackQueue.length === 0) return;
    
    // Get the next entity ID
    const nextEntityId = attackQueue.shift();
    
    // Find the entity
    const entities = World.getAllEntities();
    const target = entities.find(entity => entity.getName && entity.getName() === nextEntityId);
    
    if (target) {
        sendAttack(target);
    } else if (dataObject.debug2Mode) {
        ChatLib.chat(`&c[&3ZPPVP&b] » Queued entity ${nextEntityId} no longer found`);
    }
}

// Cancel server hit animations for entities we've already hit
register("packetReceived", (packet, event) => {
    if (!dataObject.enabled) return;
    
    // Check if in GUI and module should be disabled
    if (dataObject.disableInGUI && inGUI) return;

    if (dataObject.debugMode) {
        ChatLib.chat(`&b[&3DEBUG&b] Received packet: ${packet.getClass().getSimpleName()}`);
    }

    // Cancel entity damage animations (hit effects) from server - SIMPLIFIED TO AVOID ERRORS
    if (packet instanceof S19PacketEntityStatus) {
        try {
            const status = packet.func_149160_c();
            if (status === 2) { // Hurt animation status
                // If we have any pending attacks, cancel all hurt animations
                // This is less precise but avoids method signature errors
                if (pendingAttacks.size > 0) {
                    if (dataObject.debug2Mode) {
                        ChatLib.chat(`&b[&3ZPPVP&b] » Cancelled server hit animation (simplified)`);
                    }
                    
                    if (dataObject.renderEffects) {
                        cancel(event);
                    }
                    
                    // Process next queued attack if in high-ping mode
                    if (dataObject.highPingMode) {
                        processQueue();
                    }
                }
            }
        } catch (e) {
            // Silently ignore damage animation errors since they're not critical
            if (dataObject.debug2Mode) {
                ChatLib.chat(`&c[&3ZPPVP&b] » Damage animation error (non-critical): ${e.message}`);
            }
        }
    }
    
    // Cancel arm swing animations from server - IMPROVED ERROR HANDLING
    if (packet instanceof S0BPacketAnimation) {
        try {
            const animationType = packet.func_148977_d();
            
            // Only care about arm swing animations (type 0)
            if (animationType === 0) {
                // For arm swings, we can be less specific about which entity
                // Just cancel all arm swing animations when we're actively attacking
                if (attacking) {
                    if (dataObject.debug2Mode) {
                        ChatLib.chat("&b[&3ZPPVP&b] » Cancelled server arm swing animation");
                    }
                    cancel(event);
                }
            }
        } catch (e) {
            // Silently ignore arm animation errors since they're not critical
            // Only log if in debug mode
            if (dataObject.debug2Mode) {
                ChatLib.chat(`&c[&3ZPPVP&b] » Arm animation error (non-critical): ${e.message}`);
            }
        }
    }
});

// Track sent attack packets for debugging
register("packetSent", (packet) => {
    if (!dataObject.enabled) return;
    
    // Check if in GUI and module should be disabled
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

// Reset state when changing worlds
register("worldLoad", () => {
    dataObject.save();
    pendingAttacks.clear();
    attackQueue = [];
    attacking = false;
    lastTargetId = -1;
    inGUI = false;
});

// Initialization message
ChatLib.chat("&b[&3ZPPVP&b] Module loaded! Use &b/zppvp toggle&3 to enable.");
ChatLib.chat("&b[&3ZPPVP&b] Use &b/zppvp recommend&3 for optimal settings.");

# ZeroPingPvP

ALWAYS TEST ON A ALT YOU DO NOT CARE ABOUT BEFORE USING ON YOUR MAIN
This is mostly safe but sometimes can be detected if the code is messed up even by one line and sends too many packets accidentally.

Uses C02PacketUseEntity packet to make PvP feel instant by simulating hits client-side.
Use /zppvp to see commands

Uses C02PacketUseEntity to detect when the client sends an attack packet then simulates the hit client-sided.
Helps with high ping players on Hypixel or any PvP server.

---- 22nd May 2026 edit ----

Normally when you left click an enemy, Minecraft sends a C02PacketUseEntity attack packet, the server processes it, and sends back S19PacketEntityStatus to show the hurt flash. You feel the delay.
With ZeroPingPvP your left click is intercepted, instantly sends C0APacketAnimation swing and C02PacketUseEntity attack, and applies the hurt effect client side. When the server's S19 confirmation arrives it's cancelled since the effect is already shown. In high ping mode, clicks that arrive while the server hasn't confirmed yet are queued and wait for confirmation.

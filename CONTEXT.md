# Combat console

The combat console holds the Game Master’s current fight and the references needed to run it.

## Language

**Working board**:
The in-memory encounter state that responds immediately to the Game Master’s actions.
_Avoid_: Live copy, current copy

**Recovery copy**:
The device-local snapshot used to restore a working board after a reload, crash, or temporary service failure.
_Avoid_: Local save, cache

**Cloud copy**:
The owner-scoped durable snapshot available to a signed-in Game Master across sessions and devices.
_Avoid_: Server state, remote board

**Committed action**:
A Game Master action already applied to the working board. Draft form values and unconfirmed choices are not committed actions.
_Avoid_: Saved action

**Divergent copies**:
Recovery and cloud copies that contain independent committed actions, so neither can safely replace the other automatically.
_Avoid_: Newer save, sync error

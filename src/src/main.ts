import { Tower } from "./tower"
import { CommonFunctions } from "./commonFuncs"
import { UnsignedNumber } from "./unsignedNum"
import { task_names } from "./enums"
import { Links } from "./links"
import { CreepManager } from "./creepManager"
import { RoomManager } from "./roomManager"




let cur_task: UnsignedNumber
let should_init = true


const harvesterLink = new Links(task_names[task_names.harvester], 100)
const tower = new Tower()
const creep_manager = CreepManager.getInstance()

function findStructAtPosition(x: number, y: number, room: Room, type: StructureConstant) {
  const structs_at_spawn_pos = room.lookAt(x, y)
  let is_struct_at_pos = false

  for (const struct of structs_at_spawn_pos) {
    if (struct.structure?.structureType === type) {
      is_struct_at_pos = true
      break
    }
  }

  return is_struct_at_pos
}

function checkToActivateSafeMode(spawn: StructureSpawn) {
  const num_of_towers = RoomManager.getInstance().getMyStructs([STRUCTURE_TOWER]).length

  if (
    RoomManager.getInstance().isUnderAttack()
    && !findStructAtPosition(spawn.pos.x, spawn.pos.y, spawn.room, STRUCTURE_RAMPART)
    && num_of_towers > 0
  ) {
    spawn.room.controller?.activateSafeMode()
  }
  else if (spawn.hits <= spawn.hitsMax / 5) {
    spawn.room.controller?.activateSafeMode()
  }
}

function onDestroy() {
  
}

//creep_manager.start()

export const loop = function () {
 
  
  const roomManager = RoomManager.getInstance()

  for (const room_name in Game.rooms) {
    const cur_room = Game.rooms[room_name]

    CommonFunctions.setRoom(cur_room)
    roomManager.process(cur_room)

    tower.run(cur_room)
    harvesterLink.run(cur_room)
    creep_manager.run()
  }
  
  tower.reset()
  harvesterLink.reset()
  roomManager.destroy()
};

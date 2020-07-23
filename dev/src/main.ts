import { Defender } from "./creep-logic/defender"
import { Tower } from "./struct-logic/tower";
import { CommonFunctions } from "./commonFuncs";
import { UnsignedNumber } from "./unsignedNum";
import { flags, task_names } from "./enums";
import { Links } from "./struct-logic/links";
import { CreepManager } from "./managers/creepManager";
import { RoomManager } from "./managers/roomManager";




let cur_task: UnsignedNumber
let should_init = true


let harvesterLink = new Links(task_names[task_names.harvester], 100)
const tower = new Tower()
const creep_manager = new CreepManager()

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


function createFlags(spawn: StructureSpawn) {
  let flag_das_present = false
  let flag_supplier_wait = false
  let flag_harvester_wait = false

  const flags_in_room = RoomManager.getInstance().getFlags()

  for (const flag_found of flags_in_room) {
    if (flag_found.name === CommonFunctions.getFlagName(flags.DAS, spawn.room)) {
      flag_das_present = true
    }
    else if (flag_found.name === CommonFunctions.getFlagName(flags.supplier_wait, spawn.room)) {
      flag_supplier_wait = true
    }
    else if (flag_found.name === CommonFunctions.getFlagName(flags.harvester_wait, spawn.room)) {
      flag_harvester_wait = true
    }
  }

  const mid_room_x = 24
  const mid_room_y = 24
  let flag_name: string

  if (!flag_harvester_wait) {
    flag_name = CommonFunctions.getFlagName(flags.harvester_wait, spawn.room)
    spawn.room.createFlag(mid_room_x, mid_room_y, flag_name)
  }

  if (!flag_supplier_wait) {
    flag_name = CommonFunctions.getFlagName(flags.supplier_wait, spawn.room)
    spawn.room.createFlag(mid_room_x, mid_room_y, flag_name)
  }

  if (!flag_das_present) {
    flag_name = CommonFunctions.getFlagName(flags.DAS, spawn.room)
    spawn.room.createFlag(mid_room_x, mid_room_y, flag_name)
  }
}

function checkToActivateSafeMode(spawn: StructureSpawn) {
  const num_of_towers = RoomManager.getInstance().getMyStructs([STRUCTURE_TOWER])

  if (Defender.underAttack
    && !findStructAtPosition(spawn.pos.x, spawn.pos.y, spawn.room, STRUCTURE_RAMPART)
    && typeof (num_of_towers) === "number"
    && num_of_towers > 0
  ) {
    spawn.room.controller?.activateSafeMode()
  }
  else if (spawn.hits <= spawn.hitsMax / 5) {
    spawn.room.controller?.activateSafeMode()
  }
}

function onSetUp(spawn: StructureSpawn) {
  if (should_init) {
    cur_task = new UnsignedNumber(spawn.memory.cur_task)
    should_init = false
  }
}

function onDestroy() {
  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  for (const name in Memory.flags) {
    if (!(name in Game.flags)) {
      delete Memory.flags[name]
    }
  }
}


export const loop = function () {
  onDestroy()
  // for (let spawn_name in Game.spawns) {
  //   const spawn = Game.spawns[spawn_name]

  //   if (!CommonFunctions.hasRoom(spawn.room)) {
  //     createFlags(spawn)
  //     CommonFunctions.addRoom(spawn.room)
  //   }

  //   onSetUp(spawn)

  //   checkToActivateSafeMode(spawn)



  // }
  

  for (const room_name in Game.rooms) {
   

    const roomManager = RoomManager.getInstance()
    const cur_room = Game.rooms[room_name]

    CommonFunctions.setRoom(cur_room)
    roomManager.process(cur_room)

    tower.run(cur_room)
    harvesterLink.run(cur_room)


    creep_manager.run(cur_room)
  }
  
  tower.reset()
  harvesterLink.reset()
};

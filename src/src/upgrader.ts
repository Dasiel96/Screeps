
import { CommonFunctions } from "./commonFuncs"
import { CreepTask } from "./creepTasks"
import { task_names } from "./enums"
import { CreepActions } from "./creepAction"
export class Upgrader extends CreepTask {
    protected role = task_names[task_names.upgrader]

    protected log(){

    }

    getRole(): string {
        return this.role
    }

    protected runLogic(creep: Creep) {

        CommonFunctions.changeWorkingState(creep)
        const source_key = "source"
        const controller_key = "controller"


        if (!creep.memory.working) {
            if (!creep.memory[source_key]){
                creep.memory[source_key] = creep.pos.findClosestByPath(FIND_SOURCES)!!.id
            }

            CreepActions.harvest(creep)
        }
        else {
            if (!creep.memory[controller_key]){
                creep.memory[controller_key] = creep.room.controller?.id
            }

            const controller = Game.getObjectById<StructureController>(creep.memory[controller_key])
            const upgrade_status = creep.upgradeController(controller!!)
            const sign_status = creep.signController(controller!!, "")
            const sign = controller?.sign
            
            if (controller && (upgrade_status === ERR_NOT_IN_RANGE || (sign && sign_status === ERR_NOT_IN_RANGE))) {
                creep.moveTo(controller, CommonFunctions.pathOptions())
            }
        }
    }

    protected createLogic(): boolean {
        const existing_upgraders = this.manager.getMyCreeps(this.role).length
        const should_spawn = existing_upgraders < this.cap
        this.skeleton.work = 3
        this.skeleton.carry = 4
        this.skeleton.move = 7

        this.num_of_creeps = existing_upgraders
        
        return should_spawn
    }
}
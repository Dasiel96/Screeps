import { CommonFunctions } from "./commonFuncs"
import { CreepTask } from "./creepTasks"
import { task_names } from "./enums"
import { CreepActions } from "./creepAction"
import { CreepData } from "./interfaces"

export class Upgrader extends CreepTask {
    protected role = task_names[task_names.upgrader]

    private calcBodyCost(work: number, carry: number, move: number) {
        const work_cost = 50
        const carry_cost = 50
        const move_cost = 100

        return (work_cost * work) + (carry_cost * carry) + (move_cost * move)
    }

    protected startLogic(creep: Creep) {

    }

    protected runLogic(creep: Creep) {

        CommonFunctions.changeWorkingState(creep)
        const source_key = "source"
        const controller_key = "controller"


        if (!creep.memory.working) {
            if (!creep.memory[source_key]) {
                creep.memory[source_key] = creep.pos.findClosestByPath(FIND_SOURCES)!!.id
            }

            CreepActions.harvest(creep)
        }
        else {
            if (!creep.memory[controller_key]) {
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

    protected spawnCheck(): boolean {
        const existing_upgraders = this.manager.getMyCreeps(this.role).length
        const should_spawn = existing_upgraders < this.cap

        const energy_to_use = this.manager.getRoom()?.energyCapacityAvailable

        if (energy_to_use !== undefined) {

            let num_of_work = 1
            let num_of_carry = 1
            let num_of_move = 1

            while (this.calcBodyCost(num_of_work, num_of_carry, num_of_move) < energy_to_use) {
                num_of_work++
                num_of_carry++
                num_of_move++

            }

            if (this.calcBodyCost(num_of_work, num_of_carry, num_of_move) > energy_to_use) {
                num_of_work--
                num_of_carry--
                num_of_move--
            }

            this.skeleton.work = num_of_work
            this.skeleton.move = num_of_move
            this.skeleton.carry = num_of_carry
        }



        this.num_of_creeps = existing_upgraders

        return should_spawn
    }

    protected destroyLogic(creep: CreepData) {

    }

    getRole(): string {
        return this.role
    }
}
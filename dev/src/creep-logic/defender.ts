import { CreepTask } from "./creepTasks";
import { CommonFunctions } from "../commonFuncs";
import { task_names } from "../enums";
import { RoomManager } from "../managers/roomManager";

export class Defender extends CreepTask {

    private rampart_creep: Creep | null = null
    private enemies: Creep[] | null = null

    protected role = task_names[task_names.defender]

    /**
     * This task is used to make creeps that will attack other creeps in the room not
     * under my ownership
     */
    constructor() {
        super()
    }

    static get underAttack(): boolean {
        let len = RoomManager.getInstance().getHostileCreeps().length
        return len > 0
    }

    /**
     * @param creep_array
     * @returns returns an Array of creeps that doesn't have 2 different
     */
    private removeDuplicateCreeps(creep_array: Creep[]): Creep[] {
        const creep_duplicate_check = new Map<string, boolean>()
        const duplicates_removed_array: Creep[] = []

        for (const creep of creep_array) {
            if (!creep_duplicate_check.has(creep.name)) {
                duplicates_removed_array.push(creep)
                creep_duplicate_check.set(creep.name, true)
            }
        }

        return duplicates_removed_array
    }

    private storeEnemies(creep: Creep) {
        this.enemies = []
        const healers = new Array<Creep>()
        const range = new Array<Creep>()
        const attack = new Array<Creep>()
        const the_rest = new Array<Creep>()

        const creeps = this.manager.getHostileCreeps()


        for (const hc of creeps) {
            let was_added = false
            for (const part of hc.body) {
                if (part.type === HEAL) {
                    healers.push(hc)
                    was_added = true
                    break
                }
                else if (part.type === RANGED_ATTACK) {
                    range.push(hc)
                    was_added = true
                    break
                }
                else if (part.type === ATTACK) {
                    attack.push(hc)
                    was_added = true
                    break
                }
            }
            if (!was_added) {
                the_rest.push(hc)
            }
        }


        this.enemies = [...healers, ...range, ...attack, ...the_rest]

        this.enemies = this.removeDuplicateCreeps(this.enemies)
    }

    protected log() {

    }

    getRole(): string {
        return this.role
    }

    protected runLogic(creep: Creep) {

        const rampart_id = "rampart"

        if (this.enemies === null || this.enemies.length === 0) {
            this.storeEnemies(creep)
        }

        if (this.rampart_creep === null) {
            this.rampart_creep = creep
        }
        else if (this.rampart_creep.ticksToLive && creep.ticksToLive) {
            if (this.rampart_creep.ticksToLive < creep.ticksToLive) {
                this.rampart_creep = creep
            }
        }

        if (this.enemies!!.length > 0) {
            const enemy = this.enemies!![0]
            const attack_status = creep.attack(enemy)
            const attack_ranged_statuse = creep.rangedMassAttack()


            if (this.rampart_creep.name === creep.name && attack_status !== ERR_INVALID_TARGET) {

                if (!creep.memory[rampart_id]) {
                    const rampart = enemy.pos.findClosestByPath(FIND_STRUCTURES, { filter: (s) => { return s.structureType === STRUCTURE_RAMPART } })
                    creep.memory[rampart_id] = rampart?.id
                }

                const rampart = Game.getObjectById<StructureRampart>(creep.memory[rampart_id])
                if (rampart) {
                    creep.moveTo(rampart, CommonFunctions.pathOptions())
                }
            }
            else if (attack_status === ERR_NOT_IN_RANGE) {
                creep.moveTo(enemy, CommonFunctions.pathOptions())
            }
            else {
                this.enemies!!.shift()
            }

        }
        else {
            creep.suicide()
            this.enemies = null
            this.rampart_creep = null
        }

    }

    protected createLogic(): boolean {
        const num_of_enemies = this.manager.getHostileCreeps().length
        const num_of_defenders = this.manager.getMyCreeps(this.role).length
        this.num_of_creeps = num_of_defenders
        this.cap = num_of_enemies


        let should_spawn = false


        should_spawn = num_of_defenders < num_of_enemies


        this.skeleton.move = 5
        this.skeleton.tough = 10
        this.skeleton.attack = 4
        this.skeleton.ranged_attack = 4

        return should_spawn
    }

}

import { CreepTask } from "./creepTasks"
import { CommonFunctions } from "./commonFuncs"
import { task_names } from "./enums"
import { RoomManager } from "./roomManager"
import { threadId } from "worker_threads"
import { CreepData } from "./interfaces"

export class Defender extends CreepTask {

    // stores a list of id strings for each hostile creep in the room
    private enemies = new Array<string>()

    // used to quickly access which creep to target from the array enemies
    private enemy_index = 0

    protected role = task_names[task_names.defender]

    /**
     * This task is used to make creeps that will attack other creeps in the room not
     * under my ownership
     */
    constructor() {
        super()
    }

    /**
     * Returns an array containing a list containing creeps id strings
     *
     * @param   {Creep[]}  creep_array  an array of creeps that can contain multiple entries consisting of the same creep
     *
     * @return  {Creep[]}               an array in which each string represents a creep id and no two elements are identical
     * @author Daniel Schechtman
     */
    private removeDuplicateCreeps(creep_array: Creep[]): Creep[] {
        const creep_duplicate_check = new Map<string, boolean>()
        const duplicates_removed_array: Creep[] = []

        for (const creep of creep_array) {
            if (!creep_duplicate_check.has(creep.id)) {
                duplicates_removed_array.push(creep)
                creep_duplicate_check.set(creep.id, true)
            }
        }

        return duplicates_removed_array
    }

    /**
     * returns an array of all enemy ids in the room
     *
     * @return  {Array<string>}
     * @author Daniel Schechtman
     */
    private getEnemyIds(): Array<string> {
        let all_enemy_creeps: Array<Creep> 
        const all_enemy_creeps_id = new Array<string>()
    
        const healers = this.manager.getHostileCreeps(HEAL)
        const range_attackers = this.manager.getHostileCreeps(RANGED_ATTACK)
        const attackers = this.manager.getHostileCreeps(ATTACK)
        const misc_creeps = this.manager.getHostileCreeps(MOVE)

        all_enemy_creeps = [...healers, ...range_attackers, ...attackers, ...misc_creeps]

        for (const creep of this.removeDuplicateCreeps(all_enemy_creeps)) {
            all_enemy_creeps_id.push(creep.id)
        }

        return all_enemy_creeps_id
    }

    protected startLogic(creep: Creep) {

    }

    protected runLogic(creep: Creep) {

        // saves on computation by storing results on what enemies are in
        // the room vs checking what enemies are in the room every tick
        if (this.enemies.length === 0) {
            this.enemies = this.getEnemyIds()
        }

        if (this.enemy_index < this.enemies.length) {
            const enemy = Game.getObjectById<Creep>(this.enemies[this.enemy_index])

            if (enemy !== null) {
                const attack_status = creep.attack(enemy)
                const attack_ranged_statuse = creep.rangedMassAttack()


                if (attack_status === ERR_NOT_IN_RANGE) {
                    creep.moveTo(enemy, CommonFunctions.pathOptions())
                }
            }
            else {
                this.enemy_index++
            }

        }
        else {
            creep.suicide()
            this.enemies = new Array()
            this.enemy_index = 0
        }

    }

    protected spawnCheck(): boolean {
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

    protected destroyLogic(creep: CreepData) {
        
    }

    getRole(): string {
        return this.role
    }

}

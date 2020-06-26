import { CreepTask } from "./creepTasks";
import { CommonFunctions } from "../commonFuncs";
import { WhiteList } from "../whiteListed";
import { task_names } from "../enums";

export class Defender extends CreepTask {
    protected role = task_names[task_names.defender]

    private rampart_creep: Creep | null = null
    private enemies: Creep[] | null = null

    private static under_attack = false

    constructor() {
        super()
        WhiteList.add("Cciradih")
    }

    static get underAttack(): boolean {
        return CommonFunctions.getHostileCreeps()!!.length > 0
    }

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
        const healers = CommonFunctions.getHostileCreeps(HEAL)
        const range = CommonFunctions.getHostileCreeps(RANGED_ATTACK)
        const attack = CommonFunctions.getHostileCreeps(ATTACK)
        const the_rest = CommonFunctions.getHostileCreeps()

        if (attack) {
            this.enemies = this.enemies.concat(attack)
        }
        if (range) {
            this.enemies = this.enemies.concat(range)
        }
        if (healers) {
            this.enemies = this.enemies.concat(healers)
        }
        if (the_rest) {
            this.enemies = this.enemies.concat(the_rest)
        }

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

    protected createLogic(master: StructureSpawn): boolean {
        const num_of_enemies = CommonFunctions.getHostileCreeps()?.length
        const num_of_defenders = CommonFunctions.getMyCreeps(this.role, master).length

        let should_spawn = false

        if (num_of_enemies) {
            should_spawn = num_of_defenders < num_of_enemies
        }

        this.skeleton.move = 5
        this.skeleton.tough = 10
        this.skeleton.attack = 4
        this.skeleton.ranged_attack = 4

        const body = CommonFunctions.createBody(this.skeleton)
        const name = CommonFunctions.createName(this.role)
        const role = CommonFunctions.createMemData(this.role, master.room.name)

        Defender.under_attack = Boolean(num_of_enemies)

        if (should_spawn) {
            master.spawnCreep(body, name, role)
        }

        return !should_spawn
    }

}

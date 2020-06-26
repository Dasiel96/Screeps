export class RepairTarget {
    private struct_id: string
    private target_id: string

    constructor(struct_id: string, target_id: string) {
        this.struct_id = struct_id
        this.target_id = target_id
    }

    set struct(id: string) {
        this.struct_id = id
    }

    set target(id: string) {
        this.target_id = id
    }

    repair() {
        const struct = Game.getObjectById<StructureTower>(this.struct_id)
        let target = Game.getObjectById<Structure>(this.target_id)

        let can_repair = Boolean(struct) && Boolean(target)


        if (can_repair && target!!.hits < target!!.hitsMax) {
            struct?.repair(target!!)
        }
        else {
            can_repair = false
        }

        return can_repair
    }

    hasTarget() {
        let ret_val = false
        let cur_target = Game.getObjectById<Structure>(this.target_id)
        if(cur_target){
            ret_val = Boolean(cur_target) && cur_target.hits < cur_target.hitsMax
        }
        return ret_val
    }
}
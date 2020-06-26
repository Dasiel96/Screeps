import { Body } from "./interfaces"
import { CommonFunctions } from "./commonFuncs"


export abstract class CreepTask{
    protected abstract role: string

    protected cap = 1

    protected readonly skeleton: Body = {
        work: 0,
        carry: 0,
        move: 0,
        tough: 0,
        attack: 0,
        ranged_attack: 0,
        heal: 0,
        claim: 0,
    }

    

    protected abstract log(): void


    /**
     * runs the creep's task
     * @param creep
     */
    protected abstract runLogic(creep: Creep): any

    /**
     * creates a creep of a specific role, and returns true if the creep was able to be
     * spawned
     * @param master
     */
    protected abstract createLogic(master: StructureSpawn): boolean

    /**
     * returns the role that this task assigns to
     * a creep
     */
    abstract getRole(): string


    run(creep: Creep){
        try{
            this.runLogic(creep)
        }
        catch(e_){
            const error: Error = e_
            console.log(error.stack)
            console.log(`Task: ${this.getRole()}, Error: ${error}`)
        }
    }

    create(master: StructureSpawn){
        let was_created = false;
        try{
           was_created = this.createLogic(master)
        }
        catch(error){
            console.log((error as Error).stack)
            console.log(`Created: ${this.getRole()}, Error: ${error}`)

            // makes sure there is no block if an error happens in one creep create
            // and the program thinks it wasn't created. leading to the script trying to make
            // a creep that currently can't be made
            was_created = true
        }

        return was_created
    }
}

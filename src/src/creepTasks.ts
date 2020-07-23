import { Body } from "./interfaces"
import { RoomManager } from "./roomManager"

/**
 * base class for all creep tasks that need to be performed around the colony. 
 * each CreepTask just performs logic associated with each task, CreepTask instances
 * are not meant to be created for each creep that is currently alive.
 */
export abstract class CreepTask{
    /**
     * a way to identify each creep to determine which task it should be passed into
     */
    protected abstract role: string

    /**
     * a way to determine how many creeps of a specific task can exist at any given time
     */
    protected cap = 1

    /**
     * A way to determine how many creeps of a specific task that currently exist
     */
    protected num_of_creeps = 0

    /**
     * determines how many body parts of each type to be used when constructing a creep body
     */
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

    /**
     * gets the body the creep will use to construct it's body during spawning
     * @returns a Body object holding data set in the create method
     * @author Daniel Schechtman
     */
    get body() {
        return this.skeleton
    }

    /**
     * gets the maximum number of creeps of a specific task
     * @returns a number that represents how many creeps of a specific task that can exist at any given time
     * @author Daniel Schechtman
     */
    get creepCap() {
        return this.cap
    }

    /**
     * gets the current number of creeps of a specific task that exist
     * @returns a number representing how many creeps of a specific task that currently exist
     * @author Daniel Schechtman
     */
    get existingCreeps() {
        return this.num_of_creeps
    }

    /**
     * An object that finds all searchable things in a room. Made this an inheratable instance for easy access
     * in all CreepTasks
     */
    protected manager = RoomManager.getInstance()


    /**
     * this is where the logic of a specific task is run
     * @param creep: the creep with the corrisponding the creep.memory.role with the task to run the logic of the task
     * @returns nothing
     * @author Daniel Schechtman
     */
    protected abstract runLogic(creep: Creep): void

    /**
     * determines if a creep of a specific task should be created
     * @returns a boolean that is true if a creep of a specific task should be spawned
     * @author Daniel Schechtman
     */
    protected abstract createLogic(): boolean

    /**
     * returns the role that this task assigns to
     * @returns: returns the value used to create the creep.memory.role identifier
     * @author Daniel Schechtman
     */
    abstract getRole(): string


    /**
     * runs the logic for a specific task safely so if a bug in a specific task crashes the task, the script as a whole isn't stopped
     * @param creep the creep associated with a specfic task as determined by creep.memory.role
     * @returns nothing
     * @author Daniel Schechtman
     */
    run(creep: Creep): void{
        try{
            this.runLogic(creep)
        }
        catch(e_){
            const error: Error = e_
            console.log(error.stack)
            console.log(`Task: ${this.getRole()}, Error: ${error}`)
        }
    }

    /**
     * Returns a true value if the creep of a specific task needs to be spawned. Does this in a safe way that protects a 
     * crash within the create logic from crashing the whole script
     * @returns a true value if a creep of a specific task needs to be spawned
     * @author Daniel Schechtman
     */

    create(){
        let was_created = false;
        try{
           was_created = this.createLogic()
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

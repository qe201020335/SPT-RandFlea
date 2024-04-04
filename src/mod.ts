import { DependencyContainer } from "tsyringe";
import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";

class Mod implements IPreAkiLoadMod
{
    // DO NOT leave static references to ANY resolved dependency.
    // ALWAYS use the container to resolve dependencies
    // ****** ALWAYS *******
    private static container: DependencyContainer;
    
    // Perform these actions before server fully loads
    public preAkiLoad(container: DependencyContainer): void 
    {
        // We will save a reference to the dependency container to resolve dependencies
        // that we may need down the line
        Mod.container = container;
    }
}

module.exports = { mod: new Mod() }
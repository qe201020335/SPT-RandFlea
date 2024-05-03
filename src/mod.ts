import { DependencyContainer, Lifecycle } from "tsyringe";
import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { Statics } from "./statics";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { RandomizedRagfairOfferGenerator } from "./RandomizedRagfairOfferGenerator";

class Mod implements IPreAkiLoadMod
{
    private readonly mod: string
    private logger: ILogger
    private container: DependencyContainer;

    constructor()
    {
        this.mod = "SkyTweaks";
    }

    public preAkiLoad(container: DependencyContainer): void
    {
        this.container = container;
        this.logger = container.resolve<ILogger>("WinstonLogger");
        this.logger.info(`[${this.mod}] preAki Loading... `)
        Statics.container = container

        container.register<RandomizedRagfairOfferGenerator>("RandomizedRagfairOfferGenerator", RandomizedRagfairOfferGenerator);
        container.register("RagfairOfferGenerator", { useToken: "RandomizedRagfairOfferGenerator" });
        this.logger.success(`[${this.mod}] RagfairOfferGenerator override by RandomizedRagfairOfferGenerator.`)
    }
}

module.exports = { mod: new Mod() }
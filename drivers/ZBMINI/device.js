'use strict';

const { ZigBeeDevice } = require("homey-zigbeedriver");

const SonoffOnOffCluster = require("../../lib/SonoffOnOffCluster");

const { Cluster, CLUSTER } = require('zigbee-clusters');

Cluster.addCluster(SonoffOnOffCluster);

class SonoffZBMINI extends ZigBeeDevice {

    async onInit() {
        // Self-healing: restore any capabilities declared in the manifest that are missing from the device instance
        let manifestCapabilities = this.driver.manifest?.capabilities;
        if (!manifestCapabilities) {
            const Homey = require('homey');
            const driverManifest = Homey.manifest?.drivers?.find(d => d.id === this.driver.id);
            manifestCapabilities = driverManifest?.capabilities || [];
        }

        this.log(`[Self-healing Debug] Device: ${this.getName()}, Manifest capabilities:`, manifestCapabilities, 'Device capabilities:', this.getCapabilities());
        for (const cap of manifestCapabilities) {
            if (!this.hasCapability(cap)) {
                this.log(`[Self-healing] Restoring missing capability: ${cap}`);
                this.addCapability(cap).catch(this.error);
            }
        }

        // Self-healing class migration for devices with 'migrate_to_socket' capability
        if (this.hasCapability('migrate_to_socket')) {
            this.log(`[Self-healing] Migrating ${this.getName()} class to socket...`);
            this.setClass('socket')
                .then(() => {
                    this.log(`[Self-healing] Successfully migrated ${this.getName()} to socket. Removing migrate_to_socket capability...`);
                    return this.removeCapability('migrate_to_socket');
                })
                .catch(this.error);
        }

        await super.onInit();
    }

  /**
   * onNodeInit is called when the device is initialized.
   * This is a public method.
   *
   * @public
   * @param {object} args - Arguments.
   * @param {object} args.zclNode - The ZCL Node instance.
   * @returns {Promise<void>}
   */
    async onNodeInit({ zclNode }) {
        this.log('Device initialized');
        if (process.env.DEBUG === "1") {
            this.printNode();
        }

        if (this.hasCapability('onoff')) {
            this.registerCapability('onoff', CLUSTER.ON_OFF);
        }
    }

    

  /**
   * onDeleted is called when the user deleted the device.
   */
    async onDeleted() {
        this.log("smartswitch removed");
    }

}

module.exports = SonoffZBMINI;

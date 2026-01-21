@injectable()
export class CreateBookingUseCase implements ICreateBookingUseCase {
  constructor(
    @inject(REPOSITORY_TOKENS.ServiceRepository)
    private serviceRepository: IServiceRepository,

    @inject(REPOSITORY_TOKENS.ServiceBookingRepository)
    private serviceBookingRepository: IServiceBookingRepository,
  ) {}

  async execute(
    userId: mongoose.Types.ObjectId,
    serviceId: mongoose.Types.ObjectId,
    address: IAddress,
    preferredServiceTime: IPreferredServiceDateTime,
    liveLocation?: IliveLocation,
  ): Promise<IServiceBooking> {
    const session: ClientSession = await mongoose.startSession();
    session.startTransaction();
    try {
      console.log("im useCase booking");
      const service = await this.serviceRepository.findById(serviceId);
      if (!service) {
        throw new Error("Service not found");
      }

      const hasActiveBooking =
        await this.serviceBookingRepository.hasActiveBooking(userId, serviceId);

      if (hasActiveBooking) {
        throw new Error("User already has an active booking");
      }

      const activeServices =
        await this.serviceBookingRepository.countActiveServices(
          service.serviceProviderId,
        );
      console.log(activeServices);
      if (activeServices >= 2) {
        throw new Error("Service provider is busy");
      }

      const bookingData: IServiceBooking = {
        serviceProviderId: service.serviceProviderId,
        serviceId,
        userId,
        address,
        serviceStatus: "pending",
        paymentType: "pending",
        paymentStatus: "pending",
        bookedTime: new Date(),
        preferredSlot: preferredServiceTime,
        ...(liveLocation && { liveLocation }),
      };

      const result =
        await this.serviceBookingRepository.createServiceBooking(bookingData);

      if (!result || !result._id) {
        throw new Error("Failed to book service");
      }

      await this.serviceBookingRepository.addBookingHistory(
        result._id,
        "booked",
        "Service has been booked",
      );
      await session.commitTransaction();
      session.endSession();

      const bookingQueueService = container.resolve(BookingQueueService);
      await bookingQueueService.addAutoCancelJob(
        new Types.ObjectId(result._id.toString()),
      );

      return result;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}
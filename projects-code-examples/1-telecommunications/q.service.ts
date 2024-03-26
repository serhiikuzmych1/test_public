(async () => {
  try {
    await initConsumer(processIncomingKafkaMessage);
  } catch (error) {
    console.log("Error starting service\n", error);
    process.exit(1);
  }
  console.log("Service Started");
})();

async function shutdown() {
  let code = 0;
  try {
    await consumer.disconnect();
  } catch (e) {
    code = 1;
  } finally {
    process.exit(code);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function processIncomingKafkaMessage({ topic, message }: EachMessagePayload) {
  const data = message?.value ? JSON.parse(message.value.toString()) : {};

  const span = tracer.startSpan("Process Incoming Kafka Message", {
    attributes: { ...formatLogData({ data, topic }) },
  });

  return context.with(trace.setSpan(context.active(), span), () => {
    processIncomingMessage(data, span);
    span.end();
    return Promise.resolve();
  });
}

function processIncomingMessage(data: any, currentSpan?: Span) {
  const span = tracer.startSpan("Process Incoming Message", {
    attributes: {
      ...formatLogData({
        data,
      }),
    },
  });

  if (currentSpan) {
    trace.setSpan(context.active(), currentSpan);
  }

  if (!data) return;

  context.with(trace.setSpan(context.active(), span), getOpenTelemetryHandler(data, span));

  span.end();

  return Promise.resolve();
}

function getOpenTelemetryHandler(data: any, span: Span) {
  async function openTelemetryHandler() {
    const incomingCallInfo = data;

    if (incomingCallInfo.currentLocation !== "PL" || incomingCallInfo.queueType !== "limited")
      return;

    try {
      const callRoutingTypeArray = await fvStore.readQuery(
        getRoutingTypeQuery(incomingCallInfo.queueID)
      );

      if (!callRoutingTypeArray) return;

      if (callRoutingTypeArray[0]?.routingType !== "desk") return;

      context.with(
        trace.setSpan(context.active(), span),
        getFunctionToGetQueueAllCallInformationAndProcessIt(incomingCallInfo, span)
      );
    } catch (error: any) {
      const routingTypeSpan = tracer.startSpan("Get Routing Type");
      routingTypeSpan.recordException(error);
      routingTypeSpan.setStatus({ code: SpanStatusCode.ERROR });
      routingTypeSpan.end();
    } finally {
      span.end();
    }
  }

  return openTelemetryHandler;
}

function getFunctionToGetQueueAllCallInformationAndProcessIt(incomingCallInfo: any, span: Span) {
  async function getQueueAllCallInformationAndProcessIt() {
    try {
      const allCallInfo = await fvStore.readQuery(
        getQueueCallInformation(incomingCallInfo.queueCallManagerID)
      );

      if (allCallInfo.length === 0) {
        span.end();
        return Promise.resolve();
      }

      try {
        const dataFromHelper = await wrapWithOpenTelemetry(
          "Get Agent Info",
          getAgentInfo,
          incomingCallInfo.queueID
        );

        if (!dataFromHelper) {
          span.end();
          return Promise.resolve();
        }

        const dataForContactAgent = {
          // ....
        };

        const message = communicatorSys.buildMessage("none" as any, "transmission" as any, {
          info: dataForContactAgent,
        });

        communicatorSys[COMMUNICATOR_METHODS.PEER_GROUP_ROUND_ROBIN]("queueContactAgent", message);
      } catch (error: any) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
    } finally {
      span.end();
    }
  }

  return getQueueAllCallInformationAndProcessIt;
}

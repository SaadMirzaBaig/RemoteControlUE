#include "ObjectManager.h"

#include "Components/StaticMeshComponent.h"
#include "Dom/JsonObject.h"
#include "Engine/StaticMesh.h"
#include "Engine/StaticMeshActor.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Materials/MaterialInterface.h"
#include "Modules/ModuleManager.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "WebSocketsModule.h"

AObjectManager::AObjectManager()
{
	PrimaryActorTick.bCanEverTick = false;
}

void AObjectManager::BeginPlay()
{
	Super::BeginPlay();

	// Use the default basic-shape material so we can change the color of spawned meshes dynamically.
	BaseMaterial = LoadObject<UMaterialInterface>(nullptr, TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
	ConnectWebSocket();
}

void AObjectManager::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (WebSocket.IsValid())
	{
		WebSocket->Close();
		WebSocket.Reset();
	}

	Super::EndPlay(EndPlayReason);
}

void AObjectManager::ConnectWebSocket()
{
	// Check if websockets module is loaded.
	if (!FModuleManager::Get().IsModuleLoaded(TEXT("WebSockets")))
	{
		FModuleManager::Get().LoadModule(TEXT("WebSockets"));
	}

	FWebSocketsModule& WebSocketsModule = FWebSocketsModule::Get();
	WebSocket = WebSocketsModule.CreateWebSocket(TEXT("ws://127.0.0.1:8000/ws/unreal"));

	WebSocket->OnConnected().AddLambda([]()
	{
		UE_LOG(LogTemp, Log, TEXT("ObjectManager connected to WebSocket server."));
	});

	WebSocket->OnConnectionError().AddLambda([](const FString& Error)
	{
		UE_LOG(LogTemp, Error, TEXT("ObjectManager WebSocket connection error: %s"), *Error);
	});

	WebSocket->OnClosed().AddLambda([](int32 StatusCode, const FString& Reason, bool bWasClean)
	{
		UE_LOG(LogTemp, Warning, TEXT("ObjectManager WebSocket closed. Code=%d Clean=%s Reason=%s"), StatusCode, bWasClean ? TEXT("true") : TEXT("false"), *Reason);
	});

	WebSocket->OnMessage().AddUObject(this, &AObjectManager::HandleWebSocketMessage);
	// Connect to the websocket server when all checks are done.
	WebSocket->Connect();
}

void AObjectManager::HandleWebSocketMessage(const FString& Message)
{
	// store the message in a JSON object
	TSharedPtr<FJsonObject> JsonMessage;
	const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Message);
	if (!FJsonSerializer::Deserialize(Reader, JsonMessage) || !JsonMessage.IsValid())
	{
		UE_LOG(LogTemp, Warning, TEXT("ObjectManager received invalid JSON: %s"), *Message);
		return;
	}

	FString EventName;
	if (!JsonMessage->TryGetStringField(TEXT("event"), EventName))
	{
		UE_LOG(LogTemp, Warning, TEXT("ObjectManager received JSON without 'event'."));
		return;
	}

	const TSharedPtr<FJsonObject>* ObjectDataPtr = nullptr;
	if (!JsonMessage->TryGetObjectField(TEXT("payload"), ObjectDataPtr) || ObjectDataPtr == nullptr || !ObjectDataPtr->IsValid())
	{
		UE_LOG(LogTemp, Warning, TEXT("ObjectManager received event without valid payload: %s"), *EventName);
		return;
	}

	if (EventName == TEXT("object_created"))
	{
		HandleObjectCreated(*ObjectDataPtr);
	}
	else if (EventName == TEXT("object_updated"))
	{
		HandleObjectUpdated(*ObjectDataPtr);
	}
	else if (EventName == TEXT("object_deleted"))
	{
		HandleObjectDeleted(*ObjectDataPtr);
	}
	else
	{
		UE_LOG(LogTemp, Warning, TEXT("ObjectManager received unknown event: %s"), *EventName);
	}
}

void AObjectManager::HandleObjectCreated(const TSharedPtr<FJsonObject>& ObjectData)
{
	FString Id;
	FString Shape;
	double SizeValue = 100.0;

	if (!ObjectData->TryGetStringField(TEXT("id"), Id) || !ObjectData->TryGetStringField(TEXT("shape"), Shape) || !ObjectData->TryGetNumberField(TEXT("size"), SizeValue))
	{
		UE_LOG(LogTemp, Warning, TEXT("object_created payload missing required fields."));
		return;
	}

	const FLinearColor Color = ParseColorField(ObjectData);

	FVector Location;
	FRotator Rotation;
	ParseTransformFromPayload(ObjectData, Location, Rotation);

	SpawnOrReplaceActor(Id, Shape, Color, static_cast<float>(SizeValue), Location, Rotation);
}

void AObjectManager::HandleObjectUpdated(const TSharedPtr<FJsonObject>& ObjectData)
{
	FString Id;
	FString Shape;
	double SizeValue = 100.0;

	if (!ObjectData->TryGetStringField(TEXT("id"), Id) || !ObjectData->TryGetStringField(TEXT("shape"), Shape) || !ObjectData->TryGetNumberField(TEXT("size"), SizeValue))
	{
		UE_LOG(LogTemp, Warning, TEXT("object_updated payload missing required fields."));
		return;
	}

	AActor** ExistingActorPtr = ObjectMap.Find(Id);
	if (ExistingActorPtr == nullptr || !IsValid(*ExistingActorPtr))
	{
		// ignore unknown ids.
		UE_LOG(LogTemp, Warning, TEXT("object_updated for unknown id: %s"), *Id);
		return;
	}

	const FLinearColor Color = ParseColorField(ObjectData);
	ApplyActorVisuals(*ExistingActorPtr, Shape, Color, static_cast<float>(SizeValue));
	ApplyActorTransform(*ExistingActorPtr, ObjectData);
}

void AObjectManager::HandleObjectDeleted(const TSharedPtr<FJsonObject>& ObjectData)
{
	FString Id;
	if (!ObjectData->TryGetStringField(TEXT("id"), Id))
	{
		UE_LOG(LogTemp, Warning, TEXT("object_deleted payload missing id."));
		return;
	}

	AActor** ExistingActorPtr = ObjectMap.Find(Id);
	if (ExistingActorPtr != nullptr && IsValid(*ExistingActorPtr))
	{
		(*ExistingActorPtr)->Destroy();
	}

	ObjectMap.Remove(Id);
}

AActor* AObjectManager::SpawnOrReplaceActor(const FString& Id, const FString& Shape, const FLinearColor& Color, float Size, const FVector& Location, const FRotator& Rotation)
{
	// Replace any previous actor tied to this backend ID to keep state in sync.
	if (AActor** ExistingActorPtr = ObjectMap.Find(Id))
	{
		if (IsValid(*ExistingActorPtr))
		{
			(*ExistingActorPtr)->Destroy();
		}
		ObjectMap.Remove(Id);
	}

	UWorld* World = GetWorld();
	if (World == nullptr)
	{
		return nullptr;
	}

	AStaticMeshActor* NewActor = World->SpawnActor<AStaticMeshActor>(AStaticMeshActor::StaticClass(), Location, Rotation);
	if (!IsValid(NewActor))
	{
		return nullptr;
	}

	if (UStaticMeshComponent* SpawnedMeshComponent = NewActor->GetStaticMeshComponent())
	{
		SpawnedMeshComponent->SetMobility(EComponentMobility::Movable);
	}

	ApplyActorVisuals(NewActor, Shape, Color, Size);
	ObjectMap.Add(Id, NewActor);
	return NewActor;
}

void AObjectManager::ApplyActorVisuals(AActor* Actor, const FString& Shape, const FLinearColor& Color, float Size)
{
	AStaticMeshActor* StaticMeshActor = Cast<AStaticMeshActor>(Actor);
	if (!IsValid(StaticMeshActor))
	{
		return;
	}

	UStaticMeshComponent* MeshComponent = StaticMeshActor->GetStaticMeshComponent();
	if (!IsValid(MeshComponent))
	{
		return;
	}

	if (UStaticMesh* Mesh = GetMeshForShape(Shape))
	{
		MeshComponent->SetStaticMesh(Mesh);
	}

	UMaterialInterface* MaterialToUse = BaseMaterial;
	if (!IsValid(MaterialToUse))
	{
		// User the default material if the base material fails to load.
		MaterialToUse = MeshComponent->GetMaterial(0);
	}

	if (IsValid(MaterialToUse))
	{
		UMaterialInstanceDynamic* DynamicMaterial = UMaterialInstanceDynamic::Create(MaterialToUse, this);
		if (IsValid(DynamicMaterial))
		{
			DynamicMaterial->SetVectorParameterValue(TEXT("Color"), Color);
			MeshComponent->SetMaterial(0, DynamicMaterial);
		}
	}

	// 1 unit size from front end in UE.
	const float UniformScale = FMath::Max(0.01f, Size);
	StaticMeshActor->SetActorScale3D(FVector(UniformScale));
}

void AObjectManager::ParseTransformFromPayload(const TSharedPtr<FJsonObject>& ObjectData, FVector& OutLocation, FRotator& OutRotation) const
{
	OutLocation = FVector::ZeroVector;
	OutRotation = FRotator::ZeroRotator;

	if (!ObjectData.IsValid())
	{
		return;
	}

	const TSharedPtr<FJsonObject>* PositionObj = nullptr;
	if (ObjectData->TryGetObjectField(TEXT("position"), PositionObj) && PositionObj != nullptr && (*PositionObj).IsValid())
	{
		double X = 0.0;
		double Y = 0.0;
		double Z = 0.0;
		(*PositionObj)->TryGetNumberField(TEXT("x"), X);
		(*PositionObj)->TryGetNumberField(TEXT("y"), Y);
		(*PositionObj)->TryGetNumberField(TEXT("z"), Z);
		OutLocation = FVector(static_cast<float>(X), static_cast<float>(Y), static_cast<float>(Z));
	}

	const TSharedPtr<FJsonObject>* RotationObj = nullptr;
	if (ObjectData->TryGetObjectField(TEXT("rotation"), RotationObj) && RotationObj != nullptr && (*RotationObj).IsValid())
	{
		double Pitch = 0.0;
		double Yaw = 0.0;
		double Roll = 0.0;
		(*RotationObj)->TryGetNumberField(TEXT("pitch"), Pitch);
		(*RotationObj)->TryGetNumberField(TEXT("yaw"), Yaw);
		(*RotationObj)->TryGetNumberField(TEXT("roll"), Roll);
		OutRotation = FRotator(static_cast<float>(Pitch), static_cast<float>(Yaw), static_cast<float>(Roll));
	}
}

void AObjectManager::ApplyActorTransform(AActor* Actor, const TSharedPtr<FJsonObject>& ObjectData) const
{
	if (!IsValid(Actor) || !ObjectData.IsValid())
	{
		return;
	}

	FVector Location;
	FRotator Rotation;
	ParseTransformFromPayload(ObjectData, Location, Rotation);
	Actor->SetActorLocation(Location);
	Actor->SetActorRotation(Rotation);
}

UStaticMesh* AObjectManager::GetMeshForShape(const FString& Shape) const
{
	const FString NormalizedShape = Shape.ToLower();

	if (NormalizedShape == TEXT("cube"))
	{
		return LoadObject<UStaticMesh>(nullptr, TEXT("/Engine/BasicShapes/Cube.Cube"));
	}
	if (NormalizedShape == TEXT("sphere"))
	{
		return LoadObject<UStaticMesh>(nullptr, TEXT("/Engine/BasicShapes/Sphere.Sphere"));
	}
	if (NormalizedShape == TEXT("cylinder"))
	{
		return LoadObject<UStaticMesh>(nullptr, TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
	}

	// load cube as default incase of invalid shape.
	return LoadObject<UStaticMesh>(nullptr, TEXT("/Engine/BasicShapes/Cube.Cube"));
}

FLinearColor AObjectManager::ParseColorField(const TSharedPtr<FJsonObject>& ObjectData) const
{
	FString ColorPreset;
	if (ObjectData->TryGetStringField(TEXT("color"), ColorPreset))
	{
		return ColorFromPreset(ColorPreset);
	}

	const TArray<TSharedPtr<FJsonValue>>* ColorArray = nullptr;
	if (ObjectData->TryGetArrayField(TEXT("color"), ColorArray) && ColorArray != nullptr && ColorArray->Num() >= 3)
	{
		// Accept RGB arrays in the familiar 0-255 range from the backend/frontend.
		const double R = (*ColorArray)[0].IsValid() ? (*ColorArray)[0]->AsNumber() : 255.0;
		const double G = (*ColorArray)[1].IsValid() ? (*ColorArray)[1]->AsNumber() : 255.0;
		const double B = (*ColorArray)[2].IsValid() ? (*ColorArray)[2]->AsNumber() : 255.0;

		return FLinearColor(
			FMath::Clamp(static_cast<float>(R) / 255.0f, 0.0f, 1.0f),
			FMath::Clamp(static_cast<float>(G) / 255.0f, 0.0f, 1.0f),
			FMath::Clamp(static_cast<float>(B) / 255.0f, 0.0f, 1.0f),
			1.0f
		);
	}

	return FLinearColor::White;
}

FLinearColor AObjectManager::ColorFromPreset(const FString& Preset)
{
	const FString Normalized = Preset.ToLower();

	// Keep this list aligned with frontend color presets.
	if (Normalized == TEXT("red")) return FLinearColor::Red;
	if (Normalized == TEXT("green")) return FLinearColor::Green;
	if (Normalized == TEXT("blue")) return FLinearColor::Blue;
	if (Normalized == TEXT("yellow")) return FLinearColor::Yellow;
	if (Normalized == TEXT("black")) return FLinearColor::Black;
	if (Normalized == TEXT("white")) return FLinearColor::White;
	if (Normalized == TEXT("orange")) return FLinearColor(1.0f, 0.5f, 0.0f, 1.0f);
	if (Normalized == TEXT("purple")) return FLinearColor(0.5f, 0.0f, 0.5f, 1.0f);

	return FLinearColor::White;
}
